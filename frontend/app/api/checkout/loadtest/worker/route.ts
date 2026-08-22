/**
 * POST /api/checkout/loadtest/worker
 * Staging-only: one concurrent Square sandbox program checkout + fulfill.
 * Auth: Authorization: Bearer $CHECKOUT_LOADTEST_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  assertCheckoutLoadtestAllowed,
  runLoadtestWorker,
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
    const workerId = Number(body.workerId)
    const programId = String(body.programId ?? '').trim() || undefined
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }
    if (!Number.isFinite(workerId) || workerId < 0) {
      return NextResponse.json({ error: 'workerId required' }, { status: 400 })
    }

    const result = await runLoadtestWorker({ runId, workerId, programId })
    const status =
      result.outcome === 'ok'
        ? 200
        : result.outcome === 'pay_fail'
          ? 502
          : result.outcome === 'pay_ok_fulfill_fail'
            ? 502
            : 500
    return NextResponse.json(result, { status })
  } catch (err) {
    console.error('[checkout/loadtest/worker]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Loadtest worker failed' },
      { status: 500 },
    )
  }
}
