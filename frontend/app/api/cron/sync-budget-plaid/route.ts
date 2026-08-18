/**
 * GET /api/cron/sync-budget-plaid
 * Daily BoA → planning budget via Plaid.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePlaidItem } from '@/lib/staff/plaid-items'
import { refreshPlaidIntoBudget } from '@/lib/staff/plaid-sync'
import { DEFAULT_FISCAL_YEAR } from '@/lib/staff/budget'
import { plaidConfigured } from '@/lib/staff/plaid'

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
  if (!plaidConfigured() || !(await hasActivePlaidItem())) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Plaid not connected' })
  }
  try {
    const result = await refreshPlaidIntoBudget({
      fiscalYear: DEFAULT_FISCAL_YEAR,
      actorEmail: 'cron',
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('cron sync-budget-plaid', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Plaid budget sync failed' },
      { status: 500 },
    )
  }
}
