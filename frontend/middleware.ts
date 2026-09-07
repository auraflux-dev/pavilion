/**
 * Next.js middleware. runs on matched requests.
 *
 * 1. Protect member-only routes with a real member session (not visitor tokens).
 * 2. Same-origin CSRF guard for mutating API routes.
 * 3. Wix auth path rewrites after DNS cutover.
 *
 * Visitor Wix tokens are minted in auth routes (login/join/email/google), not here.
 * eager generateVisitorTokens on every first page hit burned Fluid Active CPU.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import { isSameOriginRequest } from '@/lib/security/csrf'
import { DEMO_REVIEW_COOKIE, hasDemoReviewCookie, peekDemoReviewSession } from '@/lib/demo/cookie'
import {
  demoWriteResponse,
  isDemoJoinAllowPath,
  isDemoPiiPath,
  isWriteMethod,
} from '@/lib/demo/guard'
import { hasBetterAuthCookie, isCommonsPlatformHost, isDemoHostForMiddleware, isSharedProductHost } from '@/lib/crm/auth-edge'
import { PAVILION_SURFACE_HEADER } from '@/lib/crm/product-host'
import { commonsRequiresLogin, isCommonsPublicPath } from '@/lib/crm/private-tenant'
import { isDemoInstance } from '@/lib/demo/instance'
import { isDemoPublicBrandSlug } from '@/lib/crm/demo-public-brands'
import { isCommonsDemoHiddenPath } from '@/lib/demo/commons-surface'
import { demoPiiStub } from '@/lib/demo/seed'
import {
  fixturePiiStub,
  isSyntheticPiiPath,
  isSyntheticStagingFromRequest,
  isSyntheticWriteAllowPath,
  syntheticWriteResponse,
} from '@/lib/fixtures'

const PROTECTED_ROUTES = ['/member-portal', '/staff']
/** Keep in sync with ACTIVITY_CORRELATION_COOKIE in platform-activity.ts */
const ACTIVITY_CORRELATION_COOKIE = 'pavilion_act_cid'

function firePasswordResetTokenHit(req: NextRequest, token: string) {
  try {
    const origin = req.nextUrl.origin
    const pepper =
      process.env.PLATFORM_ACTIVITY_PEPPER?.trim() ||
      process.env.CRON_SECRET?.trim() ||
      process.env.HSKRG_AGENT_API_KEY?.trim() ||
      'pavilion-activity-dev'
    const correlationId = req.cookies.get(ACTIVITY_CORRELATION_COOKIE)?.value || ''
    const ua = req.headers.get('user-agent') || ''
    void fetch(`${origin}/api/ops/platform-activity`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pavilion-activity-ingest': pepper,
      },
      body: JSON.stringify({
        category: 'auth',
        action: 'password_reset_token_hit',
        actorKind: 'anonymous',
        outcome: 'ok',
        route: req.nextUrl.pathname,
        correlationId,
        tokenFingerprintSource: token,
        detail: `ua=${ua.slice(0, 80)}`,
      }),
    }).catch(() => {})
  } catch {
    /* never block reset redirect */
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase().split(':')[0] ||
    req.headers.get('host')?.trim().toLowerCase().split(':')[0] ||
    ''
  const demo = isDemoHostForMiddleware(host) || (!host && isDemoInstance())
  const trialHost = isCommonsPlatformHost(host)
  const surface = demo ? 'demo' : trialHost ? 'trial' : 'other'

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(PAVILION_SURFACE_HEADER, surface)

  function next(): NextResponse {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Trial vanity hosts are private. Unified stack: gate by Host, not env-only commonsRequiresLogin().
  if (trialHost && commonsRequiresLogin(host) && !isCommonsPublicPath(pathname)) {
    const commonsOk = hasBetterAuthCookie(req.cookies.getAll().map((c) => c.name))
    if (!commonsOk) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''))
      return NextResponse.redirect(loginUrl)
    }
  }

  const synthetic = !demo && !trialHost && isSyntheticStagingFromRequest(req)

  // Vanity / custom Host → hard-gate locked trials (P1). Shared product hosts skipped.
  if (
    trialHost &&
    !isCommonsPublicPath(pathname) &&
    !pathname.startsWith('/api/')
  ) {
    const host =
      req.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase().split(':')[0] ||
      req.headers.get('host')?.trim().toLowerCase().split(':')[0] ||
      ''
    if (host && !isSharedProductHost(host)) {
      try {
        const statusUrl = new URL('/api/commons/host-status', req.url)
        const statusRes = await fetch(statusUrl, {
          headers: {
            'x-forwarded-host': host,
            host,
          },
          cache: 'no-store',
        })
        if (statusRes.ok) {
          const data = (await statusRes.json()) as { matched?: boolean; locked?: boolean }
          if (data.matched && data.locked) {
            const lockedUrl = req.nextUrl.clone()
            lockedUrl.pathname = '/trial-locked'
            lockedUrl.search = ''
            return NextResponse.redirect(lockedUrl)
          }
        }
      } catch {
        // Fail open: Node routes still enforce assertOrgWritable on writes.
      }
    }
  }

  if (demo && isCommonsDemoHiddenPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      if (isWriteMethod(req.method)) return demoWriteResponse()
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return new NextResponse('Not found', { status: 404 })
  }

  // Public demo ?brand= only for allowlisted preview skins (never spring-hill).
  if (demo && req.method === 'GET' && !pathname.startsWith('/api/')) {
    const brand = (req.nextUrl.searchParams.get('brand') || '').trim().toLowerCase()
    if (brand) {
      const url = req.nextUrl.clone()
      url.searchParams.delete('brand')
      const res = NextResponse.redirect(url)
      if (brand === 'riverside' || brand === 'clear' || brand === 'default' || brand === '') {
        res.cookies.set('pavilion_brand', '', {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
      } else if (isDemoPublicBrandSlug(brand)) {
        res.cookies.set('pavilion_brand', brand, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        })
      } else {
        // Ignore / clear non-public packs so old ?brand=spring-hill links cannot skin the demo.
        res.cookies.set('pavilion_brand', '', {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
      }
      return res
    }
  }

  if (demo && (pathname === '/perch' || pathname.startsWith('/perch/'))) {
    const url = req.nextUrl.clone()
    url.pathname = pathname.replace(/^\/perch/, '/cove') || '/cove'
    return NextResponse.rewrite(url)
  }

  // Short table QR URL → free signup (hard redirect for scanners / SMS links)
  if (pathname === '/join') {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/join'
    if (!url.searchParams.has('returnTo')) {
      url.searchParams.set('returnTo', '/member-portal')
    }
    return NextResponse.redirect(url)
  }

  // Wix password-reset emails land on the published site with
  // ?forgotPasswordToken=… (Members Area UI). After DNS cutover that is
  // Next.js, which ignored the token and showed the homepage. Send the
  // browser to the still-published Wix site so the reset form opens.
  // (Proxying the Wix home caused a Location rewrite loop back to www.)
  const forgotPasswordToken =
    req.nextUrl.searchParams.get('forgotPasswordToken') ||
    req.nextUrl.searchParams.get('forgetPasswordToken')
  if (
    forgotPasswordToken &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_api/') &&
    !pathname.startsWith('/__auth/') &&
    !pathname.startsWith('/_serverless/') &&
    !pathname.startsWith('/_partials/')
  ) {
    firePasswordResetTokenHit(req, forgotPasswordToken)
    const upstream =
      process.env.WIX_AUTH_UPSTREAM_HOST?.trim() || 'treasurer7596.wixsite.com'
    const sitePath = process.env.WIX_AUTH_SITE_PATH?.trim() || '/shms-pto-2026'
    const dest = new URL(`https://${upstream}${sitePath}/`)
    req.nextUrl.searchParams.forEach((value, key) => {
      dest.searchParams.set(key, value)
    })
    return NextResponse.redirect(dest)
  }

  // Wix login UI needs /_api, /__auth, /_serverless, /_partials on www.
  // After DNS cutover those hit Vercel. rewrite to the Node proxy.
  if (
    pathname.startsWith('/_api/') ||
    pathname.startsWith('/__auth/') ||
    pathname.startsWith('/_serverless/') ||
    pathname.startsWith('/_partials/')
  ) {
    const rewriteUrl = req.nextUrl.clone()
    rewriteUrl.pathname = `/api/wix-auth-proxy${pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

  if (pathname.startsWith('/api/') && !isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  if (demo && pathname.startsWith('/api/')) {
    if (isWriteMethod(req.method) && !isDemoJoinAllowPath(pathname)) {
      return demoWriteResponse()
    }
    if (req.method === 'GET' && isDemoPiiPath(pathname)) {
      const peek = peekDemoReviewSession(req.cookies.get(DEMO_REVIEW_COOKIE)?.value)
      return NextResponse.json(demoPiiStub(pathname, peek))
    }
  }

  if (synthetic && pathname.startsWith('/api/')) {
    if (isWriteMethod(req.method) && !isSyntheticWriteAllowPath(pathname)) {
      return syntheticWriteResponse()
    }
    if (req.method === 'GET' && isSyntheticPiiPath(pathname)) {
      return NextResponse.json(fixturePiiStub(pathname, null))
    }
  }

  // Printable payment cheat sheet on Stone Hill. no session (table QR / print).
  const staffPublic =
    !demo &&
    !synthetic &&
    (pathname === '/staff/in-person' || pathname.startsWith('/staff/in-person/'))

  if (!staffPublic && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    const demoOk =
      demo && hasDemoReviewCookie(req.cookies.get(DEMO_REVIEW_COOKIE)?.value)
    const commonsOk =
      trialHost &&
      hasBetterAuthCookie(req.cookies.getAll().map((c) => c.name))
    if (!isMemberTokens(tokens) && !demoOk && !commonsOk) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = demo
        ? '/review'
        : trialHost
          ? '/login'
          : '/auth/join'
      if (!demo && !trialHost) loginUrl.searchParams.set('mode', 'login')
      loginUrl.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''))
      return NextResponse.redirect(loginUrl)
    }
  }

  return next()
}

export const config = {
  matcher: [
    /*
     * Skip static assets, Next internals, and Vercel probes. they do not need
     * auth/CSRF and were inflating middleware Active CPU under Open House load.
     */
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)',
  ],
}
