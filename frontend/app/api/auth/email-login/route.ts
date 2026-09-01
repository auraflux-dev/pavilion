/**
 * POST /api/auth/email-login
 * Server-side email/password (and verification). Wix validates credentials,
 * then we exchange the sessionToken for real member tokens via PKCE
 * redirect-session + authorize (no API-key external-login / wrong MST2 id).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy, LoginState } from '@wix/sdk'
import { redirects } from '@wix/redirects'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'
import { approvePendingMemberByEmail } from '@/lib/auth-approve-member'
import { isDemoInstance } from '@/lib/demo/instance'
import { issueDemoReviewResponse } from '@/lib/demo/issue-session'
import { organizationIdFromRequest } from '@/lib/crm/tenant'
import {
  ACTIVITY_CORRELATION_COOKIE,
  classifyUserAgent,
  clientIpFromHeaders,
  writePlatformActivity,
} from '@/lib/ops/platform-activity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AuthCtx = {
  ip: string
  uaClass: string
  correlationId: string
  organizationId?: string
}

function logAuth(
  ctx: AuthCtx,
  opts: {
    action: 'login_success' | 'login_failed'
    email?: string
    outcome: 'ok' | 'failed' | 'ambiguous'
    detail?: string
    method?: string
  },
) {
  void writePlatformActivity({
    category: 'auth',
    action: opts.action,
    actorKind: 'member',
    email: opts.email,
    method: opts.method || 'email',
    outcome: opts.outcome,
    route: '/api/auth/email-login',
    ip: ctx.ip,
    userAgentClass: ctx.uaClass,
    correlationId: ctx.correlationId,
    detail: opts.detail,
    organizationId: ctx.organizationId,
  })
}

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

/**
 * Exchange a Wix sessionToken (from login/register/verify) for member tokens.
 * Uses redirect-session + authorize with the sessionToken. the documented
 * mobile-safe path. Doing this server-side keeps the browser on our site.
 */
async function issueMemberCookiesFromSession(
  sessionToken: string,
  returnTo: string,
  origin: string,
  contactName?: { firstName: string; lastName: string },
  authMeta?: { ctx: AuthCtx; email?: string },
): Promise<NextResponse> {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID
  if (!clientId) {
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'missing_wix_client',
      })
    }
    return NextResponse.json(
      { error: 'Server login is not configured (missing Wix client id)' },
      { status: 503 },
    )
  }

  const client = createClient({
    modules: { redirects },
    auth: OAuthStrategy({ clientId }),
  })
  const visitorTokens = await client.auth.generateVisitorTokens()
  client.auth.setTokens(visitorTokens)

  const callbackUrl = `${origin}/auth/callback`
  const oAuthData = client.auth.generateOAuthData(
    callbackUrl,
    `${origin}${returnTo}`,
  )

  const redirect = await client.redirects.createRedirectSession({
    auth: {
      authRequest: {
        clientId,
        codeChallenge: oAuthData.codeChallenge,
        codeChallengeMethod: 'S256',
        responseMode: 'query',
        responseType: 'code',
        scope: 'offline_access',
        redirectUri: callbackUrl,
        sessionToken,
        state: oAuthData.state,
      },
    },
    callbacks: { postFlowUrl: `${origin}${returnTo}` },
  })

  const authUrl = redirect.redirectSession?.fullUrl
  if (!authUrl) {
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'no_redirect_session',
      })
    }
    return NextResponse.json(
      { error: 'Could not start member session with Wix' },
      { status: 502 },
    )
  }

  const authRes = await fetch(authUrl, {
    redirect: 'manual',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; SHMSPTO/1.0)' },
  })
  const location = authRes.headers.get('location')
  if (!location || (authRes.status !== 302 && authRes.status !== 301)) {
    console.error('email-login authorize', authRes.status, location?.slice(0, 200))
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: `authorize_${authRes.status}`,
      })
    }
    return NextResponse.json(
      { error: 'Could not complete Wix member session' },
      { status: 502 },
    )
  }

  let code: string | null
  let state: string | null
  try {
    const cb = new URL(location)
    code = cb.searchParams.get('code')
    state = cb.searchParams.get('state')
  } catch {
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'invalid_authorize_redirect',
      })
    }
    return NextResponse.json(
      { error: 'Invalid Wix authorize redirect' },
      { status: 502 },
    )
  }
  if (!code || !state) {
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'missing_auth_code',
      })
    }
    return NextResponse.json(
      { error: 'Wix did not return an authorization code' },
      { status: 502 },
    )
  }

  const tokens = await client.auth.getMemberTokens(code, state, oAuthData)
  if (!tokens?.accessToken?.value || !tokens?.refreshToken?.value) {
    if (authMeta) {
      logAuth(authMeta.ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'token_issue_failed',
      })
    }
    return NextResponse.json({ error: 'Could not issue member tokens' }, { status: 502 })
  }

  if (contactName?.firstName && contactName?.lastName) {
    try {
      const { members } = await import('@wix/members')
      const named = createClient({
        modules: { members },
        auth: OAuthStrategy({ clientId }),
      })
      named.auth.setTokens(tokens)
      const current = await named.members.getCurrentMember({ fieldsets: ['FULL'] })
      const memberId = current.member?._id
      if (memberId) {
        await named.members.updateMember(memberId, {
          contact: {
            firstName: contactName.firstName,
            lastName: contactName.lastName,
          },
        } as Parameters<typeof named.members.updateMember>[1])
      }
    } catch (err) {
      console.error('email-login: could not save signup name', err)
    }
  }

  if (authMeta) {
    logAuth(authMeta.ctx, {
      action: 'login_success',
      email: authMeta.email,
      outcome: 'ok',
      detail: 'session_ok',
    })
  }

  const res = NextResponse.json({ ok: true, redirectTo: returnTo })
  res.cookies.set(TOKENS_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  })
  return res
}

export async function POST(req: NextRequest) {
  let organizationId: string | undefined
  try {
    organizationId = await organizationIdFromRequest(req)
  } catch {
    organizationId = undefined
  }
  const ctx: AuthCtx = {
    ip: clientIpFromHeaders(req),
    uaClass: classifyUserAgent(req.headers.get('user-agent') || ''),
    correlationId: req.cookies.get(ACTIVITY_CORRELATION_COOKIE)?.value || '',
    organizationId,
  }

  try {
    const body = (await req.json()) as {
      mode?: 'login' | 'signup'
      email?: string
      password?: string
      firstName?: string
      lastName?: string
      verificationCode?: string
      stateToken?: string
      returnTo?: string
    }
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    if (password.length > 0 && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      )
    }
    const signupFirstName = String(body.firstName || '').trim()
    const signupLastName = String(body.lastName || '').trim()
    const returnTo = safeReturnTo(body.returnTo)
    const origin = canonicalOrigin(req)
    const mode = body.mode === 'signup' ? 'signup' : 'login'
    const authMeta = { ctx, email: email.includes('@') ? email : undefined }

    if (isDemoInstance()) {
      const paidHint = /membership|cove|perch|upgrade|card/i.test(returnTo)
      logAuth(ctx, {
        action: 'login_success',
        email: authMeta.email,
        outcome: 'ok',
        detail: 'demo_review',
        method: 'email',
      })
      return issueDemoReviewResponse({
        req,
        lane: 'parent',
        parentKind: paidHint ? 'paid' : 'free',
        next: returnTo,
        names: {
          firstName: signupFirstName,
          lastName: signupLastName,
          email,
        },
      })
    }
    const verificationCode = String(body.verificationCode || '').trim()

    const signupName =
      signupFirstName && signupLastName
        ? { firstName: signupFirstName, lastName: signupLastName }
        : undefined

    if (mode === 'signup' && !signupName) {
      return NextResponse.json(
        { error: 'First and last name are required to create an account.' },
        { status: 400 },
      )
    }

    const client = createClient({
      auth: OAuthStrategy({
        clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
      }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)

    if (verificationCode) {
      const stateToken = String(body.stateToken || '').trim()
      if (!stateToken) {
        logAuth(ctx, {
          action: 'login_failed',
          email: authMeta.email,
          outcome: 'failed',
          detail: 'missing_verify_state',
        })
        return NextResponse.json(
          { error: 'Missing verification state. Start sign-up again.' },
          { status: 400 },
        )
      }
      const verified = await client.auth.processVerification(
        { verificationCode },
        {
          loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
          data: { stateToken },
        },
      )
      if (
        verified.loginState !== LoginState.SUCCESS ||
        !verified.data?.sessionToken
      ) {
        logAuth(ctx, {
          action: 'login_failed',
          email: authMeta.email,
          outcome: 'failed',
          detail: 'verification_failed',
        })
        return NextResponse.json(
          { error: 'Verification failed. Check the code and try again.' },
          { status: 400 },
        )
      }
      return issueMemberCookiesFromSession(
        verified.data.sessionToken,
        returnTo,
        origin,
        signupName,
        authMeta,
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const result =
      mode === 'signup'
        ? await client.auth.register({ email, password })
        : await client.auth.login({ email, password })

    if (result.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
      const stateToken =
        'data' in result && result.data && 'stateToken' in result.data
          ? String((result.data as { stateToken?: string }).stateToken || '')
          : ''
      return NextResponse.json({
        needsVerify: true,
        stateToken: stateToken || undefined,
        message: 'Check your email for a verification code, then enter it below.',
      })
    }
    // Wix site may require owner approval (or left older accounts PENDING).
 // Parents proved email/password. approve PENDING and retry once.
    // Do not steer them to @shmspto.org staff login.
    if (result.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
      const healed = await approvePendingMemberByEmail(email)
      if (healed.ok && healed.wasPending) {
        const retry = await client.auth.login({ email, password })
        if (
          retry.loginState === LoginState.SUCCESS &&
          'data' in retry &&
          retry.data?.sessionToken
        ) {
          console.info('email-login: approved PENDING member and retried login')
          return issueMemberCookiesFromSession(
            retry.data.sessionToken,
            returnTo,
            origin,
            signupName,
            authMeta,
          )
        }
      }
      if (!healed.ok && healed.reason === 'blocked') {
        logAuth(ctx, {
          action: 'login_failed',
          email: authMeta.email,
          outcome: 'failed',
          detail: 'errorCode=memberBlocked',
        })
        return NextResponse.json(
          {
            error:
              'This account is blocked. Email vp-membershipexperience@shmspto.org for help.',
            errorCode: 'memberBlocked',
          },
          { status: 403 },
        )
      }
      logAuth(ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: 'errorCode=ownerApprovalRequired',
      })
      return NextResponse.json(
        {
          error:
 'This parent account is still pending approval. Use your personal email (not @shmspto.org). If this keeps happening, email vp-membershipexperience@shmspto.org. do not use Staff login for family portal access.',
          errorCode: 'ownerApprovalRequired',
        },
        { status: 403 },
      )
    }
    if (
      result.loginState !== LoginState.SUCCESS ||
      !('data' in result) ||
      !result.data?.sessionToken
    ) {
      const fail = result as { error?: string; errorCode?: string }
      if (fail.errorCode === 'emailAlreadyExists') {
        logAuth(ctx, {
          action: 'login_failed',
          email: authMeta.email,
          outcome: 'failed',
          detail: 'errorCode=emailAlreadyExists',
        })
        return NextResponse.json(
          {
            error: 'That email already has an account. Log in instead.',
            errorCode: 'emailAlreadyExists',
          },
          { status: 409 },
        )
      }
      const code = fail.errorCode
      logAuth(ctx, {
        action: 'login_failed',
        email: authMeta.email,
        outcome: 'failed',
        detail: code ? `errorCode=${code}` : 'login_rejected',
      })
      const friendly =
        code === 'invalidPassword'
          ? 'Incorrect email or password.'
          : code === 'invalidEmail'
            ? 'No account found for that email.'
            : code === 'resetPassword'
              ? 'Please reset your password, then try again.'
              : mode === 'signup'
                ? 'Could not create account'
                : 'Could not log in'
      return NextResponse.json(
        { error: friendly, errorCode: code },
        { status: 401 },
      )
    }

    return issueMemberCookiesFromSession(
      result.data.sessionToken,
      returnTo,
      origin,
      signupName,
      authMeta,
    )
  } catch (err) {
    console.error('email-login', err)
    logAuth(ctx, {
      action: 'login_failed',
      outcome: 'failed',
      detail: err instanceof Error ? err.message.slice(0, 120) : 'exception',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not complete sign-in' },
      { status: 500 },
    )
  }
}
