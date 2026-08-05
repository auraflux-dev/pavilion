import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { exchangeAuthorizationCode } from '@/lib/canva/oauth'
import { upsertStaffCanvaTokens } from '@/lib/canva/tokens'

const COOKIE = 'canva_oauth'

function staffBase(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) return `http://${host}`
  if (host.endsWith('.vercel.app') || host.includes('shmspto.org')) return `https://${host}`
  return 'https://www.shmspto.org'
}

export async function GET(req: NextRequest) {
  const base = staffBase(req)
  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/staff?workspace=canva&canva=${encodeURIComponent(reason)}`)

  const session = await getStaffSession(req)
  if (!session?.staff || !requireStaffRole(session.staff, ['marketing', 'admin'])) {
    return fail('forbidden')
  }

  const code = req.nextUrl.searchParams.get('code') || ''
  const state = req.nextUrl.searchParams.get('state') || ''
  const oauthError = req.nextUrl.searchParams.get('error') || ''
  if (oauthError) return fail(oauthError)
  if (!code || !state) return fail('missing_code')

  const cookie = req.cookies.get(COOKIE)?.value || ''
  if (!cookie) return fail('missing_cookie')

  let stored: { verifier?: string; state?: string; email?: string; redirectUri?: string }
  try {
    stored = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8'))
  } catch {
    return fail('bad_cookie')
  }

  if (stored.state !== state) return fail('state_mismatch')
  if (stored.email && stored.email.toLowerCase() !== session.email.toLowerCase()) {
    return fail('email_mismatch')
  }
  if (!stored.verifier || !stored.redirectUri) return fail('bad_cookie')

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: stored.verifier,
      redirectUri: stored.redirectUri,
    })
    await upsertStaffCanvaTokens(session.email, {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    })
  } catch (err) {
    console.error('Canva OAuth callback failed:', err)
    return fail('token_exchange_failed')
  }

  const res = NextResponse.redirect(`${base}/staff?workspace=canva&canva=connected`)
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
