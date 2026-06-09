/**
 * Next.js middleware — runs on every request.
 *
 * Responsibilities:
 * 1. If a visitor has no Wix tokens cookie → generate anonymous visitor tokens
 *    and set them so the Wix SDK can make calls on their behalf.
 * 2. If a request hits /member-portal without member tokens → redirect to /auth/login.
 * 3. Pass tokens through for authenticated requests.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'
import { members } from '@wix/members'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'

/** Routes that require a logged-in member. */
const PROTECTED_ROUTES = ['/member-portal']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  const tokensCookie = req.cookies.get(TOKENS_COOKIE)?.value
  let tokens = tokensCookie ? JSON.parse(tokensCookie) : null

  // --- Protect member-only routes ---
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!tokens?.refreshToken?.value) {
      // Not logged in — send to login, remember where they were going
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // --- Ensure visitor token exists for all other routes ---
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
      // Non-fatal — page still renders without visitor session
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
