/**
 * GET /api/cron/sync-paypal-activity
 * Hourly PayPal account → planning budget + fundraising (school year only).
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { isPayPalConfigured } from '@/lib/paypal'
import { refreshPaypalIntoBudget } from '@/lib/staff/paypal-sync'
import { DEFAULT_FISCAL_YEAR } from '@/lib/staff/budget'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isPayPalConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'PayPal not configured' })
  }
  try {
    const result = await refreshPaypalIntoBudget({
      fiscalYear: DEFAULT_FISCAL_YEAR,
      actorEmail: 'cron',
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('cron sync-paypal-activity', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PayPal sync failed' },
      { status: 500 },
    )
  }
}
