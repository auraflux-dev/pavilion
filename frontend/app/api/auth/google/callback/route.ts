/**
 * GET /api/auth/google/callback
 * Finish Google OAuth → find/create Wix member → set session cookie.
 *
 * Used when GOOGLE_MEMBER_CLIENT_ID is set. Otherwise parent Google login
 * reuses /api/staff/workspace/connect/callback with state.flow=member
 * (same Google client. set that client to External, not Internal).
 */
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
import { organizationIdFromRequest } from '@/lib/crm/tenant'
import {
  ACTIVITY_CORRELATION_COOKIE,
  classifyUserAgent,
  clientIpFromHeaders,
  writePlatformActivity,
} from '@/lib/ops/platform-activity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function failRedirect(origin: string, returnTo: string, reason: string) {
  const fail = new URL('/auth/join', origin)
  fail.searchParams.set('mode', 'login')
  fail.searchParams.set('returnTo', returnTo)
  fail.searchParams.set('error', reason)
  return NextResponse.redirect(fail, 302)
}

async function logGoogle(
  req: NextRequest,
  opts: {
    action: 'login_success' | 'login_failed'
    email?: string
    outcome: 'ok' | 'failed'
    detail: string
  },
) {
  let organizationId: string | undefined
  try {
    organizationId = await organizationIdFromRequest(req)
  } catch {
    organizationId = undefined
  }
  void writePlatformActivity({
    category: 'auth',
    action: opts.action,
    actorKind: 'member',
    email: opts.email,
    method: 'google',
    outcome: opts.outcome,
    route: '/api/auth/google/callback',
    ip: clientIpFromHeaders(req),
    userAgentClass: classifyUserAgent(req.headers.get('user-agent') || ''),
    correlationId: req.cookies.get(ACTIVITY_CORRELATION_COOKIE)?.value || '',
    detail: opts.detail,
    organizationId,
  })
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
    void logGoogle(req, {
      action: 'login_failed',
      outcome: 'failed',
      detail: 'google_not_configured',
    })
    return clear(failRedirect(origin, returnTo, 'google_not_configured'))
  }
  if (oauthError) {
    const desc = (req.nextUrl.searchParams.get('error_description') || '').toLowerCase()
    const reason =
      /internal|organization|org-only|not completed the google verification/i.test(desc) ||
      desc.includes('access blocked')
        ? 'google_org_internal'
        : 'google_denied'
    void logGoogle(req, {
      action: 'login_failed',
      outcome: 'failed',
      detail: reason,
    })
    return clear(failRedirect(origin, returnTo, reason))
  }
  if (!code || !stateParam || stateParam !== cookieState) {
    void logGoogle(req, {
      action: 'login_failed',
      outcome: 'failed',
      detail: 'google_state_mismatch',
    })
    return clear(failRedirect(origin, returnTo, 'google_state_mismatch'))
  }

  try {
    const { tokens, email } = await completeGoogleMemberLogin({ code, redirectUri })
    void logGoogle(req, {
      action: 'login_success',
      email,
      outcome: 'ok',
      detail: 'session_ok',
    })
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
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'google_email_unverified') {
      void logGoogle(req, {
        action: 'login_failed',
        outcome: 'failed',
        detail: 'google_email_unverified',
      })
      return clear(failRedirect(origin, returnTo, 'google_email_unverified'))
    }
    void logGoogle(req, {
      action: 'login_failed',
      outcome: 'failed',
      detail: 'google_failed',
    })
    return clear(failRedirect(origin, returnTo, 'google_failed'))
  }
}
