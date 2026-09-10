import { NextRequest, NextResponse } from 'next/server'
import { getPool, ensureSubscriptionsSchema } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Nightly Neon heartbeat for Pavilion marketing (commons-site).
 * Primary durability: Neon PITR on commons-prod. Stripe is billing source of record.
 * Returns counts only. Does not print row contents.
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim()
  const auth = req.headers.get('authorization') || ''
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureSubscriptionsSchema()
  const pool = getPool()
  const subs = await pool.query<{ count: string }>(
    `select count(*)::text as count from commons_subscriptions`,
  )
  const tokens = await pool.query<{ count: string }>(
    `select count(*)::text as count from commons_account_tokens`,
  )

  return NextResponse.json({
    ok: true,
    service: 'commons-site',
    primaryDurability: 'neon-pitr',
    stripeSourceOfRecord: true,
    subscriptionRows: Number(subs.rows[0]?.count || 0),
    accountTokenRows: Number(tokens.rows[0]?.count || 0),
    at: new Date().toISOString(),
  })
}
