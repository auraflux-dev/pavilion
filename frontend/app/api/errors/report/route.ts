/**
 * POST /api/errors/report — browser / parent pasteable client errors when reporting is on.
 * Gated by ERROR_REPORTING_ENABLED.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isErrorReportingEnabled, reportError } from '@/lib/observability/error-reporting'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isErrorReportingEnabled()) {
    return NextResponse.json(
      { ok: false, error: 'Error reporting is disabled (set ERROR_REPORTING_ENABLED=true)' },
      { status: 503 },
    )
  }

  const ip = clientIp(req)
  const rl = rateLimit(`client-error:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many reports' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? 'Client error').slice(0, 2000)
  const stack = String(body.stack ?? '').slice(0, 8000)
  const path = String(body.path ?? '').slice(0, 500)
  const digest = String(body.digest ?? '').slice(0, 200)

  const eventId = await reportError(new Error(message), {
    route: path || 'client',
    tags: { source: 'browser' },
    extra: { stack, digest, userAgent: req.headers.get('user-agent') || '' },
    eventId: body.eventId ? String(body.eventId).slice(0, 80) : undefined,
  })

  return NextResponse.json({ ok: true, eventId })
}
