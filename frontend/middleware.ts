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

const PROTECTED_ROUTES = ['/member-portal', '/staff']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
    if (!isMemberTokens(tokens)) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/auth/join'
      loginUrl.searchParams.set('mode', 'login')
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
