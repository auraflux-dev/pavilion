/**
 * POST /api/webhooks/commons-square
 * Square events for Commons tenants. SHMS keeps /api/webhooks/square on env token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { commonsDbEnabled } from '@/lib/crm/db'
import { orgIdForMerchant } from '@/lib/crm/connectors'
import { markSyncOk } from '@/lib/crm/sync-state'
import { verifySquareWebhook } from '@/lib/crm/square-oauth'
import { publicSiteUrl } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Not Commons' }, { status: 404 })
  }
  const body = await req.text()
  const signatureKey = process.env.COMMONS_SQUARE_WEBHOOK_SIGNATURE_KEY?.trim() || ''
  const notificationUrl =
    process.env.COMMONS_SQUARE_NOTIFICATION_URL?.trim() ||
    `${publicSiteUrl()}/api/webhooks/commons-square`
  const signature = req.headers.get('x-square-hmacsha256-signature') ?? ''
  if (
    !verifySquareWebhook({
      signature,
      body,
      notificationUrl,
      signatureKey,
    })
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type?: string; merchant_id?: string; data?: { object?: { merchant_id?: string } } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await ensureCommonsReady()
  const merchantId = String(event.merchant_id || event.data?.object?.merchant_id || '')
  const orgId = await orgIdForMerchant(merchantId)
  if (!orgId) return NextResponse.json({ ok: true, ignored: true })
  await markSyncOk(orgId, 'square')
  return NextResponse.json({ ok: true })
}
