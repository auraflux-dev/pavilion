/**
 * POST /api/checkout/loadtest/cleanup
 * Staging-only: remove Students / enrollments / Payments for a loadtest runId.
 * Auth: Authorization: Bearer $CHECKOUT_LOADTEST_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  assertCheckoutLoadtestAllowed,
  cleanupLoadtestRun,
} from '@/lib/checkout-loadtest'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const gate = assertCheckoutLoadtestAllowed(req)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const runId = String(body.runId ?? '').trim()
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }
    const result = await cleanupLoadtestRun(runId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[checkout/loadtest/cleanup]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cleanup failed' },
      { status: 500 },
    )
  }
}
