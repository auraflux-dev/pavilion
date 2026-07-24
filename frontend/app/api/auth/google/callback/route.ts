/**
 * GET /api/auth/google/callback
 * Finish Google OAuth → find/create Wix member → set session cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'
import {
  GOOGLE_MEMBER_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  findOrCreateMemberForGoogle,
  googleMemberCallbackUrl,
  googleMemberOauthConfigured,
  googleMemberRedirectBase,
  issueMemberTokensForId,
  safeReturnTo,
} from '@/lib/auth-google-member'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function failRedirect(origin: string, returnTo: string, reason: string) {
  const fail = new URL('/auth/join', origin)
  fail.searchParams.set('mode', 'login')
  fail.searchParams.set('returnTo', returnTo)
  fail.searchParams.set('error', reason)
  return NextResponse.redirect(fail, 302)
}

export async function GET(req: NextRequest) {
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const base = googleMemberRedirectBase(host)
  const origin = base
  const cookieState = req.cookies.get(GOOGLE_MEMBER_STATE_COOKIE)?.value || ''
  const stateParam = req.nextUrl.searchParams.get('state') || ''
  const code = req.nextUrl.searchParams.get('code') || ''
  const oauthError = req.nextUrl.searchParams.get('error')

  let returnTo = '/member-portal'
  let redirectUri = googleMemberCallbackUrl(base)

  try {
    if (cookieState) {
      const parsed = JSON.parse(
        Buffer.from(cookieState, 'base64url').toString('utf8'),
      ) as { r?: string; u?: string }
      returnTo = safeReturnTo(parsed.r)
      if (parsed.u) redirectUri = parsed.u
    }
  } catch {
    /* keep defaults */
  }

  const clear = (res: NextResponse) => {
    res.cookies.set(GOOGLE_MEMBER_STATE_COOKIE, '', {
      httpOnly: true,
      secure: isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  }

  if (!googleMemberOauthConfigured()) {
    return clear(failRedirect(origin, returnTo, 'google_not_configured'))
  }
  if (oauthError) {
    return clear(failRedirect(origin, returnTo, 'google_denied'))
  }
  if (!code || !stateParam || stateParam !== cookieState) {
    return clear(failRedirect(origin, returnTo, 'google_state_mismatch'))
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code, redirectUri)
    const profile = await fetchGoogleProfile(accessToken)
    if (!profile.emailVerified) {
      return clear(failRedirect(origin, returnTo, 'google_email_unverified'))
    }
    const memberId = await findOrCreateMemberForGoogle(profile)
    const tokens = await issueMemberTokensForId(memberId)

    const res = NextResponse.redirect(new URL(returnTo, origin), 302)
    res.cookies.set(TOKENS_COOKIE, JSON.stringify(tokens), {
      httpOnly: true,
      secure: isSecure(),
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
      path: '/',
    })
    return clear(res)
  } catch (err) {
    console.error('google member callback', err)
    return clear(failRedirect(origin, returnTo, 'google_failed'))
  }
}
