/**
 * POST /api/checkout/start
 * Body: { kind: 'membership'|'store-card'|'product', tier?, amount?, productId? }
 * Returns: { checkoutUrl }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  membershipCheckoutRedirectUrl,
  productCheckoutRedirectUrl,
  storeCardCheckoutRedirectUrl,
} from '@/lib/wix-ecom-checkout'
import { getCatalogConfig, isAllowedStoreCardAmount } from '@/lib/api/catalog-config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: {
    kind?: string
    tier?: string
    amount?: number
    productId?: string
    postFlowUrl?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://shmspto.vercel.app'

  try {
    if (body.kind === 'membership') {
      const tier = body.tier === 'supreme' ? 'supreme' : body.tier === 'ruby' ? 'ruby' : null
      if (!tier) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      const checkoutUrl = await membershipCheckoutRedirectUrl(
        tier,
        body.postFlowUrl || `${origin}/membership`
      )
      return NextResponse.json({ checkoutUrl })
    }

    if (body.kind === 'store-card') {
      const amount = Number(body.amount)
      const cfg = await getCatalogConfig()
      if (!Number.isFinite(amount) || !isAllowedStoreCardAmount(amount, cfg)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
      const checkoutUrl = await storeCardCheckoutRedirectUrl(
        amount,
        body.postFlowUrl || `${origin}/store`
      )
      return NextResponse.json({ checkoutUrl })
    }

    if (body.kind === 'product') {
      if (!body.productId) {
        return NextResponse.json({ error: 'productId required' }, { status: 400 })
      }
      const checkoutUrl = await productCheckoutRedirectUrl(
        body.productId,
        body.postFlowUrl || `${origin}/spirit-wear`
      )
      return NextResponse.json({ checkoutUrl })
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  } catch (err) {
    console.error('checkout/start error:', err)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
