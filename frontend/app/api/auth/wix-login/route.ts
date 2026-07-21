/**
 * GET /api/auth/wix-login?returnTo=/member-portal
 * Server-side Wix OAuth start — one authorize URL, no client double-fetch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'
import { redirects } from '@wix/redirects'
import { OAUTH_DATA_COOKIE, isSecure } from '@/lib/auth-cookies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeReturnTo(raw: string | null): string {
  const value = (raw || '/member-portal').trim()
  if (!value.startsWith('/') || value.startsWith('//')) return '/member-portal'
  return value
}

function canonicalOrigin(req: NextRequest): string {
  const raw = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    'www.shmspto.org'
  )
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()
  if (raw === 'shmspto.org' || raw === 'www.shmspto.org') {
    return 'https://www.shmspto.org'
  }
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
  return `${proto}://${raw}`
}

export async function GET(req: NextRequest) {
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'))
  const origin = canonicalOrigin(req)

  try {
    const client = createClient({
      modules: { redirects },
      auth: OAuthStrategy({
        clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
      }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)

    const callbackUrl = `${origin}/auth/callback`
    const oAuthData = client.auth.generateOAuthData(
      callbackUrl,
      `${origin}${returnTo}`
    )
    const { authUrl } = await client.auth.getAuthUrl(oAuthData)
    if (!authUrl) throw new Error('No authUrl from Wix')

    const res = NextResponse.redirect(authUrl, 302)
    res.cookies.set(OAUTH_DATA_COOKIE, JSON.stringify(oAuthData), {
      httpOnly: false, // callback page reads via js-cookie
      secure: isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    // Clear stale Wix session cookies that poison /_api/oauth2/authorize
    for (const name of ['svSession', 'smSession']) {
      res.cookies.set(name, '', {
        domain: '.shmspto.org',
        path: '/',
        maxAge: 0,
        secure: true,
        sameSite: 'none',
      })
      res.cookies.set(name, '', { path: '/', maxAge: 0 })
    }
    return res
  } catch (err) {
    console.error('wix-login start', err)
    const fail = new URL('/auth/callback', origin)
    fail.searchParams.set('error', 'login_start_failed')
    fail.searchParams.set(
      'error_description',
      err instanceof Error ? err.message : 'Could not start Wix login'
    )
    return NextResponse.redirect(fail, 302)
  }
}
