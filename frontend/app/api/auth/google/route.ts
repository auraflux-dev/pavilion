/**
 * GET /api/auth/google?returnTo=/member-portal
 * Start Google OAuth for parent sign-up / log-in (bypasses Wix authorize host).
 */
import { NextRequest, NextResponse } from 'next/server'
import { isSecure } from '@/lib/auth-cookies'
import {
  GOOGLE_MEMBER_SCOPES,
  GOOGLE_MEMBER_STATE_COOKIE,
  googleMemberCallbackUrl,
  googleMemberClientId,
  googleMemberOauthConfigured,
  googleMemberRedirectBase,
  safeReturnTo,
} from '@/lib/auth-google-member'
import {
  isAllowedPreviewOrigin,
  isEphemeralVercelPreviewHost,
  requestOriginFromHost,
} from '@/lib/auth-preview-handoff'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PROD_ORIGIN = 'https://www.shmspto.org'

export async function GET(req: NextRequest) {
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'))
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const requestOrigin = requestOriginFromHost(host)

  // Ephemeral Preview hosts are not Google redirect URIs. Bounce to www,
  // finish OAuth there, then hand the session back to this Preview origin.
  if (isEphemeralVercelPreviewHost(host) && isAllowedPreviewOrigin(requestOrigin)) {
    const bounce = new URL('/api/auth/google', PROD_ORIGIN)
    bounce.searchParams.set('returnTo', returnTo)
    bounce.searchParams.set('previewOrigin', requestOrigin)
    return NextResponse.redirect(bounce, 302)
  }

  const previewOriginRaw = req.nextUrl.searchParams.get('previewOrigin') || ''
  const previewOrigin = isAllowedPreviewOrigin(previewOriginRaw)
    ? previewOriginRaw.replace(/\/$/, '')
    : ''

  // Always use the registered production redirect URI when handing back to Preview.
  const base = previewOrigin
    ? PROD_ORIGIN
    : googleMemberRedirectBase(host)
  const origin = base

  if (!googleMemberOauthConfigured()) {
    const fail = new URL('/auth/join', previewOrigin || origin)
    fail.searchParams.set('mode', 'login')
    fail.searchParams.set('returnTo', returnTo)
    fail.searchParams.set('error', 'google_not_configured')
    return NextResponse.redirect(fail, 302)
  }

  const redirectUri = googleMemberCallbackUrl(base)
  const nonce = crypto.randomUUID()
  const statePayload = {
    flow: 'member' as const,
    n: nonce,
    r: returnTo,
    t: Date.now(),
    u: redirectUri,
    ...(previewOrigin ? { p: previewOrigin } : {}),
  }
  const state = Buffer.from(JSON.stringify(statePayload), 'utf8').toString(
    'base64url',
  )

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', googleMemberClientId())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_MEMBER_SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('access_type', 'online')

  const res = NextResponse.redirect(url.toString(), 302)
  res.cookies.set(GOOGLE_MEMBER_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  })
  return res
}
