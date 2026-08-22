/**
 * POST /api/checkout/loadtest/paypal
 * Staging-only: create a sandbox PayPal order via our checkout helper.
 * Auth: Authorization: Bearer $CHECKOUT_LOADTEST_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  assertCheckoutLoadtestAllowed,
  runLoadtestPaypalCreate,
} from '@/lib/checkout-loadtest'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = assertCheckoutLoadtestAllowed(req)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const result = await runLoadtestPaypalCreate({
      runId: String(body.runId ?? 'pp').trim() || 'pp',
      amountDollars: Number(body.amountDollars ?? 5) || 5,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    console.error('[checkout/loadtest/paypal]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PayPal loadtest failed' },
      { status: 500 },
    )
  }
}
