/**
 * POST /api/staff/plaid/webhook
 * Plaid TRANSACTIONS webhooks → pull BoA into the planning budget.
 */
import { NextRequest, NextResponse } from 'next/server'
import { refreshPlaidIntoBudget } from '@/lib/staff/plaid-sync'
import { DEFAULT_FISCAL_YEAR } from '@/lib/staff/budget'
import { listActivePlaidItems } from '@/lib/staff/plaid-items'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    webhook_type?: string
    webhook_code?: string
    item_id?: string
  }
  const type = String(body.webhook_type ?? '').toUpperCase()
  const code = String(body.webhook_code ?? '').toUpperCase()
  if (type !== 'TRANSACTIONS' && type !== 'ITEM') {
    return NextResponse.json({ ok: true, ignored: true })
  }
  if (type === 'ITEM' && code !== 'ERROR' && code !== 'PENDING_EXPIRATION') {
    return NextResponse.json({ ok: true, ignored: true })
  }
  const items = await listActivePlaidItems()
  if (body.item_id && !items.some((i) => i.itemId === body.item_id)) {
    return NextResponse.json({ ok: true, ignored: true })
  }
  if (!items.length) return NextResponse.json({ ok: true, connected: false })

  try {
    const result = await refreshPlaidIntoBudget({
      fiscalYear: DEFAULT_FISCAL_YEAR,
      actorEmail: 'plaid-webhook',
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('plaid webhook sync', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Plaid webhook sync failed' },
      { status: 500 },
    )
  }
}
