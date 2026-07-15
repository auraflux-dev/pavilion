/**
 * POST /api/webhooks/wix-orders?token=WIX_ORDERS_WEBHOOK_SECRET
 *
 * Configure in Wix Dashboard → Automations / Webhooks for eCommerce Order Paid
 * (or forward from Zapier/Make). Payload may be a Wix order object or a thin wrapper.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  applyPaidMembership,
  tierFromProductId,
  tierFromSlugOrName,
} from '@/lib/membership-sync'

function collectTierFromOrder(order: Record<string, unknown>): {
  email: string
  tier: 'ruby' | 'supreme' | null
} {
  const buyer = (order.buyerInfo ?? order.buyer ?? {}) as {
    email?: string
  }
  // Also accept flat Automation / Zapier fields
  const email = String(
    buyer.email ??
      order.email ??
      order.buyerEmail ??
      order.payerEmail ??
      (order as { billingInfo?: { contactDetails?: { email?: string } } }).billingInfo
        ?.contactDetails?.email ??
      ''
  )
    .trim()
    .toLowerCase()

  let tier: 'ruby' | 'supreme' | null = null
  const flatTier = String(order.tier ?? order.membershipTier ?? order.productName ?? '')
  tier = tierFromSlugOrName(flatTier)

  const lineItems = (order.lineItems ?? order.items ?? []) as Record<string, unknown>[]
  for (const li of lineItems) {
    const catalog = li.catalogReference as { catalogItemId?: string } | undefined
    const productId =
      catalog?.catalogItemId ??
      (li.productId as string | undefined) ??
      (li as { itemType?: { preset?: string } }).itemType?.preset
    const productName =
      (li.productName as { original?: string } | undefined)?.original ??
      li.productName ??
      li.name ??
      li.title ??
      ''
    tier =
      tierFromProductId(typeof productId === 'string' ? productId : null) ??
      tierFromSlugOrName(String(productName)) ??
      tier
    if (tier) break
  }

  return { email, tier }
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const secret = process.env.WIX_ORDERS_WEBHOOK_SECRET
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(await req.text())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const order = (payload.data ?? payload.order ?? payload) as Record<string, unknown>
  const { email, tier } = collectTierFromOrder(order)

  if (!email || !tier) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: !email ? 'no_email' : 'not_membership_product',
    })
  }

  try {
    const result = await applyPaidMembership({ parentEmail: email, tier })
    return NextResponse.json({ ok: true, email, tier, ...result })
  } catch (err) {
    console.error('wix-orders webhook error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
