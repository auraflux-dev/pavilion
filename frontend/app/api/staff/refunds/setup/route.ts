/**
 * POST /api/staff/refunds/setup
 * President-only one-time setup: add refund tracking fields to Payments CMS.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { ensurePaymentsRefundFields } from '@/lib/staff/payments-refund-fields'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['admin'])) {
    return NextResponse.json({ error: 'President only' }, { status: 403 })
  }

  try {
    const result = await ensurePaymentsRefundFields()
    return NextResponse.json({
      ...result,
      message:
        result.created.length > 0
          ? `Added ${result.created.length} refund field(s) on Payments.`
          : 'Refund fields were already present on Payments.',
    })
  } catch (err) {
    console.error('/api/staff/refunds/setup', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    )
  }
}
