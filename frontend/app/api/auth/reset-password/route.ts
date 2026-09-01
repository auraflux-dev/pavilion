/**
 * POST /api/auth/reset-password
 * Sends a Wix password-reset email for a parent member account.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'
import { isSecure } from '@/lib/auth-cookies'
import { organizationIdFromRequest } from '@/lib/crm/tenant'
import {
  ACTIVITY_CORRELATION_COOKIE,
  classifyUserAgent,
  clientIpFromHeaders,
  newCorrelationId,
  writePlatformActivity,
} from '@/lib/ops/platform-activity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

function withCorrelation(res: NextResponse, correlationId: string) {
  res.cookies.set(ACTIVITY_CORRELATION_COOKIE, correlationId, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    maxAge: 60 * 60 * 48,
    path: '/',
  })
  return res
}

export async function POST(req: NextRequest) {
  const correlationId =
    req.cookies.get(ACTIVITY_CORRELATION_COOKIE)?.value || newCorrelationId()
  const ip = clientIpFromHeaders(req)
  const uaClass = classifyUserAgent(req.headers.get('user-agent') || '')
  let organizationId: string | undefined
  try {
    organizationId = await organizationIdFromRequest(req)
  } catch {
    organizationId = undefined
  }
  let emailForLog = ''

  try {
    const body = (await req.json()) as { email?: string; returnTo?: string }
    const email = String(body.email || '').trim().toLowerCase()
    emailForLog = email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID
    if (!clientId) {
      void writePlatformActivity({
        category: 'auth',
        action: 'password_reset_requested',
        actorKind: 'anonymous',
        email,
        method: 'email',
        outcome: 'failed',
        route: '/api/auth/reset-password',
        ip,
        userAgentClass: uaClass,
        correlationId,
        detail: 'missing_wix_client',
        organizationId,
      })
      return withCorrelation(
        NextResponse.json(
          { error: 'Password reset is not configured.' },
          { status: 503 },
        ),
        correlationId,
      )
    }

    const origin = canonicalOrigin(req)
    const client = createClient({
      auth: OAuthStrategy({ clientId }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)

    // After reset on the Wix-managed page, send them back to our login.
    // Must be an allowed OAuth redirect URI in the Wix Headless app
    // (exact match preferred; avoid extra query strings).
    const redirectUri = `${origin}/auth/join`
    await client.auth.sendPasswordResetEmail(email, redirectUri)

    void writePlatformActivity({
      category: 'auth',
      action: 'password_reset_requested',
      actorKind: 'anonymous',
      email,
      method: 'email',
      outcome: 'ok',
      route: '/api/auth/reset-password',
      ip,
      userAgentClass: uaClass,
      correlationId,
      detail: 'send_ok',
      organizationId,
    })

    return withCorrelation(
      NextResponse.json({
        ok: true,
        message:
          'If an account exists for that email, we sent a reset link. Check your inbox (and spam).',
      }),
      correlationId,
    )
  } catch (err) {
    console.error('reset-password', err)
    // Soft-fail still looks like success to the client (anti-enumeration).
    // Log as ambiguous so Staff can see the attempt.
    void writePlatformActivity({
      category: 'auth',
      action: 'password_reset_requested',
      actorKind: 'anonymous',
      email: emailForLog.includes('@') ? emailForLog : undefined,
      method: 'email',
      outcome: 'ambiguous',
      route: '/api/auth/reset-password',
      ip,
      userAgentClass: uaClass,
      correlationId,
      detail: err instanceof Error ? err.message.slice(0, 120) : 'send_error',
      organizationId,
    })
    return withCorrelation(
      NextResponse.json({
        ok: true,
        message:
          'If an account exists for that email, we sent a reset link. Check your inbox (and spam). If nothing arrives, email vp-membershipexperience@shmspto.org.',
      }),
      correlationId,
    )
  }
}
