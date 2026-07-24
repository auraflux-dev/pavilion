import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'
import {
  GOOGLE_MEMBER_STATE_COOKIE,
  completeGoogleMemberLogin,
  googleMemberCallbackUrl,
  googleMemberOauthConfigured,
  googleMemberRedirectBase,
  safeReturnTo,
} from '@/lib/auth-google-member'
import { getStaffSession } from '@/lib/staff/session'
import { upsertStaffRefreshToken } from '@/lib/google/workspace-auth'

/** Must match the redirect_uri used when starting OAuth (and Google Console). */
function redirectBase(req: NextRequest) {
  const fixed = process.env.GOOGLE_OAUTH_REDIRECT_BASE?.replace(/\/$/, '')
  if (fixed) return fixed

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`
  }
  if (
    host === 'www.shmspto.org' ||
    host === 'shmspto.org' ||
    host.endsWith('.vercel.app')
  ) {
    return host === 'shmspto.org' ? 'https://www.shmspto.org' : `https://${host}`
  }
  return 'https://www.shmspto.org'
}

type MemberState = {
  flow?: string
  r?: string
  u?: string
  n?: string
  t?: number
}

/**
 * Shared Google OAuth callback:
 * - state.flow === 'member' → parent/staff site login (Wix member session)
 * - otherwise → staff Workspace Connect (Gmail/Calendar refresh token)
 */
export async function GET(req: NextRequest) {
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const base = redirectBase(req)
  const memberBase = googleMemberRedirectBase(host)
  const stateRaw = req.nextUrl.searchParams.get('state') || ''
  const code = req.nextUrl.searchParams.get('code') || ''
  const oauthError = req.nextUrl.searchParams.get('error')

  let memberState: MemberState | null = null
  try {
    if (stateRaw) {
      memberState = JSON.parse(
        Buffer.from(stateRaw, 'base64url').toString('utf8'),
      ) as MemberState
    }
  } catch {
    memberState = null
  }

  // ── Parent / staff site login (Continue with Google) ─────────────
  if (memberState?.flow === 'member') {
    const cookieState = req.cookies.get(GOOGLE_MEMBER_STATE_COOKIE)?.value || ''
    const returnTo = safeReturnTo(memberState.r)
    const redirectUri =
      memberState.u || googleMemberCallbackUrl(memberBase)

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

    const fail = (reason: string) => {
      const url = new URL('/auth/join', memberBase)
      url.searchParams.set('mode', 'login')
      url.searchParams.set('returnTo', returnTo)
      url.searchParams.set('error', reason)
      return clear(NextResponse.redirect(url, 302))
    }

    if (!googleMemberOauthConfigured()) return fail('google_not_configured')
    if (oauthError) return fail('google_denied')
    if (!code || !stateRaw || stateRaw !== cookieState) {
      return fail('google_state_mismatch')
    }

    try {
      const { tokens } = await completeGoogleMemberLogin({ code, redirectUri })
      const res = NextResponse.redirect(new URL(returnTo, memberBase), 302)
      res.cookies.set(TOKENS_COOKIE, JSON.stringify(tokens), {
        httpOnly: true,
        secure: isSecure(),
        sameSite: 'lax',
        maxAge: TOKEN_MAX_AGE,
        path: '/',
      })
      return clear(res)
    } catch (err) {
      console.error('google member via workspace callback', err)
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'google_email_unverified') return fail('google_email_unverified')
      return fail('google_failed')
    }
  }

  // ── Staff Workspace Connect (Inbox / Calendar / Docs) ────────────
  const session = await getStaffSession(req)
  const failWorkspace = (msg: string) =>
    NextResponse.redirect(
      `${base}/staff?view=inbox&googleError=${encodeURIComponent(msg)}`,
    )

  if (!session) return failWorkspace('Sign in with your @shmspto.org staff account first.')

  if (oauthError) return failWorkspace(oauthError)
  if (!code || !stateRaw) return failWorkspace('Missing OAuth code')

  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
      email?: string
    }
    if (state.email && state.email.toLowerCase() !== session.email.toLowerCase()) {
      return failWorkspace('Google account must match your staff login email.')
    }
  } catch {
    return failWorkspace('Invalid OAuth state')
  }

  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || process.env.GMAIL_CLIENT_ID?.trim()
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || process.env.GMAIL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return failWorkspace('OAuth client not configured')

  const redirectUri = `${base}/api/staff/workspace/connect/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = (await tokenRes.json()) as {
    refresh_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenRes.ok || !tokens.refresh_token) {
    return failWorkspace(
      tokens.error_description ||
        tokens.error ||
        'No refresh token. revoke prior access and try Connect again.',
    )
  }

  try {
    await upsertStaffRefreshToken(session.email, tokens.refresh_token)
  } catch (e) {
    console.error('StaffGoogleTokens upsert failed', e)
    return failWorkspace(
      'Connected to Google but could not save token. Create CMS collection StaffGoogleTokens (email, refreshToken, active).',
    )
  }

  return NextResponse.redirect(`${base}/staff?view=inbox&google=connected`)
}
