/**
 * POST /api/ops/platform-activity
 * Fire-and-forget ingest from Edge middleware (password-reset token hits).
 * Body is already redacted / hashed. Never accepts passwords or raw tokens in clear.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  activityPepper,
  classifyUserAgent,
  clientIpFromHeaders,
  fingerprintToken,
  writePlatformActivity,
  type PlatformActivityAction,
  type PlatformActivityCategory,
} from '@/lib/ops/platform-activity'
import { organizationIdFromRequest } from '@/lib/crm/tenant'
import { rateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function ingestAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const header = req.headers.get('x-pavilion-activity-ingest') || ''
  const pepper = activityPepper()
  if (auth === `Bearer ${pepper}`) return true
  if (header && header === pepper) return true
  // Same-origin browser calls (rare): allow when Origin matches host.
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin === new URL(req.url).origin) return true
    } catch {
      /* ignore */
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  if (!ingestAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = clientIpFromHeaders(req)
  const rl = rateLimit(`platform-activity:${ip || 'unknown'}`, 60, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ ok: true, skipped: 'rate' })
  }

  const body = (await req.json().catch(() => ({}))) as {
    category?: string
    action?: string
    actorKind?: string
    emailHash?: string
    emailDomain?: string
    method?: string
    outcome?: string
    route?: string
    ip?: string
    userAgentClass?: string
    correlationId?: string
    detail?: string
    tokenFingerprintSource?: string
  }

  const action = String(body.action || '').trim()
  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 })
  }

  let organizationId: string | undefined
  try {
    organizationId = await organizationIdFromRequest(req)
  } catch {
    organizationId = undefined
  }

  const ua = req.headers.get('user-agent') || ''
  let detail = String(body.detail || '').slice(0, 500)
  if (body.tokenFingerprintSource) {
    const fp = fingerprintToken(String(body.tokenFingerprintSource))
    detail = detail ? `${detail} · tokenFp=${fp}` : `tokenFp=${fp}`
  }

  await writePlatformActivity({
    category: (String(body.category || 'auth') as PlatformActivityCategory) || 'auth',
    action: action as PlatformActivityAction,
    actorKind:
      body.actorKind === 'member' || body.actorKind === 'staff' || body.actorKind === 'system'
        ? body.actorKind
        : 'anonymous',
    emailHash: body.emailHash,
    emailDomain: body.emailDomain,
    method: body.method,
    outcome:
      body.outcome === 'failed' || body.outcome === 'ambiguous' ? body.outcome : 'ok',
    route: body.route || '/?forgotPasswordToken',
    ip: body.ip || ip,
    userAgentClass: body.userAgentClass || classifyUserAgent(ua),
    correlationId: body.correlationId,
    detail,
    organizationId,
  })

  return NextResponse.json({ ok: true })
}
