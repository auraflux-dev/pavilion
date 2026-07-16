/**
 * Next.js middleware — runs on every request.
 *
 * 1. Protect member-only routes with a real member session (not visitor tokens).
 * 2. Generate anonymous visitor tokens for everyone else.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'
import { members } from '@wix/members'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'

const PROTECTED_ROUTES = ['/member-portal', '/staff']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)

  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isMemberTokens(tokens)) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''))
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // Skip visitor bootstrap for auth + API routes
  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return res
  }

  if (!tokens) {
    try {
      const client = createClient({
        modules: { members },
        auth: OAuthStrategy({
          clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
        }),
      })
      const visitorTokens = await client.auth.generateVisitorTokens()
      res.cookies.set(TOKENS_COOKIE, JSON.stringify(visitorTokens), {
        maxAge: TOKEN_MAX_AGE,
        httpOnly: true,
        secure: isSecure(),
        sameSite: 'lax',
        path: '/',
      })
    } catch {
      // Non-fatal
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
