/**
 * POST /api/auth/complete-session
 * After email register/login returns a Wix sessionToken, finish PKCE OAuth
 * with prompt=none and redirect the browser to authorize.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'
import { redirects } from '@wix/redirects'
import { OAUTH_DATA_COOKIE, isSecure } from '@/lib/auth-cookies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeReturnTo(raw: unknown): string {
  const value = String(raw || '/member-portal').trim()
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sessionToken?: string; returnTo?: string }
    const sessionToken = String(body.sessionToken || '').trim()
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 400 })
    }
    const returnTo = safeReturnTo(body.returnTo)
    const origin = canonicalOrigin(req)

    const client = createClient({
      modules: { redirects },
      auth: OAuthStrategy({
        clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
      }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)

    const callbackUrl = `${origin}/auth/callback`
    const oAuthData = client.auth.generateOAuthData(callbackUrl, `${origin}${returnTo}`)
    const { authUrl } = await client.auth.getAuthUrl(oAuthData, {
      prompt: 'none',
      sessionToken,
    } as { prompt: 'none'; sessionToken: string })

    if (!authUrl) {
      return NextResponse.json({ error: 'No authUrl from Wix' }, { status: 502 })
    }

    const res = NextResponse.json({ authUrl })
    res.cookies.set(OAUTH_DATA_COOKIE, JSON.stringify(oAuthData), {
      httpOnly: false,
      secure: isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    return res
  } catch (err) {
    console.error('complete-session', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not complete session' },
      { status: 500 },
    )
  }
}
