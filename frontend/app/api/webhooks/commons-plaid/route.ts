/**
 * POST /api/webhooks/commons-plaid
 */
import { NextRequest, NextResponse } from 'next/server'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import {
  getConnector,
  orgIdForPlaidItem,
  putConnector,
  type PlaidConnectorSecret,
} from '@/lib/crm/connectors'
import { markSyncError, markSyncOk } from '@/lib/crm/sync-state'
import { verifyPlaidWebhook } from '@/lib/crm/webhook-verify'
import { getPlaidClient } from '@/lib/staff/plaid'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not Commons' }, { status: 404 })
  }
  const bodyText = await req.text()
  const ok = await verifyPlaidWebhook(req.headers, bodyText)
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  let body: {
    webhook_type?: string
    webhook_code?: string
    item_id?: string
    error?: { error_message?: string }
  }
  try {
    body = JSON.parse(bodyText || '{}')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  await ensureCommonsReady()
  const itemId = String(body.item_id || '')
  const orgId = await orgIdForPlaidItem(itemId)
  if (!orgId) return NextResponse.json({ ok: true, ignored: true })

  const type = String(body.webhook_type || '').toUpperCase()
  if (type === 'ITEM' && body.error?.error_message) {
    await markSyncError(orgId, 'plaid', body.error.error_message)
    return NextResponse.json({ ok: true })
  }

  try {
    const secret = await getConnector<PlaidConnectorSecret>(orgId, 'plaid')
    if (!secret) return NextResponse.json({ ok: true, connected: false })
    const client = getPlaidClient()
    const sync = await client.transactionsSync({
      access_token: secret.accessToken,
      cursor: secret.cursor || undefined,
    })
    await putConnector(
      orgId,
      'plaid',
      { ...secret, cursor: sync.data.next_cursor || secret.cursor },
      { itemId: secret.itemId },
    )
    await markSyncOk(orgId, 'plaid')
    return NextResponse.json({ ok: true, added: sync.data.added?.length || 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Plaid sync failed'
    await markSyncError(orgId, 'plaid', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
