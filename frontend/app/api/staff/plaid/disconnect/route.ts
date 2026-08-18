/**
 * POST /api/staff/plaid/disconnect
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getPlaidClient, plaidAxiosError } from '@/lib/staff/plaid'
import { deactivatePlaidItem, listActivePlaidItems } from '@/lib/staff/plaid-items'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const items = await listActivePlaidItems()
  const client = (() => {
    try {
      return getPlaidClient()
    } catch {
      return null
    }
  })()
  for (const item of items) {
    if (client) {
      try {
        await client.itemRemove({ access_token: item.accessToken })
      } catch (err) {
        const plaid = plaidAxiosError(err)
        console.error('plaid itemRemove', plaid || err)
      }
    }
    await deactivatePlaidItem(item.itemId)
  }
  return NextResponse.json({ ok: true })
}
