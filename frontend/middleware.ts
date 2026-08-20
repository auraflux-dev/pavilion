/**
 * Next.js middleware. runs on matched requests.
 *
 * 1. Protect member-only routes with a real member session (not visitor tokens).
 * 2. Same-origin CSRF guard for mutating API routes.
 * 3. Wix auth path rewrites after DNS cutover.
 *
 * Visitor Wix tokens are minted in auth routes (login/join/email/google), not here —
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
import { hasBetterAuthCookie, isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { commonsRequiresLogin, isCommonsPublicPath } from '@/lib/crm/private-tenant'
import { isDemoInstance } from '@/lib/demo/instance'
import { isCommonsDemoHiddenPath } from '@/lib/demo/commons-surface'
import { demoPiiStub } from '@/lib/demo/seed'

const PROTECTED_ROUTES = ['/member-portal', '/staff']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const demo = isDemoInstance()

  // Commons platform tenants are private — login we issue, not a public school site.
  if (commonsRequiresLogin() && !isCommonsPublicPath(pathname)) {
    const commonsOk = hasBetterAuthCookie(req.cookies.getAll().map((c) => c.name))
    if (!commonsOk) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''))
      return NextResponse.redirect(loginUrl)
    }
  }

  if (demo && isCommonsDemoHiddenPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      if (isWriteMethod(req.method)) return demoWriteResponse()
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return new NextResponse('Not found', { status: 404 })
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

  // Printable payment cheat sheet on Stone Hill — no session (table QR / print).
  const staffPublic =
    !demo &&
    (pathname === '/staff/in-person' || pathname.startsWith('/staff/in-person/'))

  if (!staffPublic && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    const demoOk =
      demo && hasDemoReviewCookie(req.cookies.get(DEMO_REVIEW_COOKIE)?.value)
    const commonsOk =
      isCommonsPlatformHost() &&
      hasBetterAuthCookie(req.cookies.getAll().map((c) => c.name))
    if (!isMemberTokens(tokens) && !demoOk && !commonsOk) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = demo
        ? '/review'
        : isCommonsPlatformHost()
          ? '/login'
          : '/auth/join'
      if (!demo && !isCommonsPlatformHost()) loginUrl.searchParams.set('mode', 'login')
      loginUrl.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''))
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Skip static assets, Next internals, and Vercel probes — they do not need
     * auth/CSRF and were inflating middleware Active CPU under Open House load.
     */
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)',
  ],
}
