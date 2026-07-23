/**
 * POST /api/checkout/quote. public price check before opening card form.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { fetchCatalogProductPrice } from '@/lib/catalog-price'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const kind = body.kind as string

    if (kind === 'membership') {
      const tier = String(body.tier ?? '').trim().toLowerCase()
      const tiers = await getPaidMembershipTiers()
      const match = tiers.find((t) => t.tierId === tier && t.active)
      if (!match || match.price <= 0) {
        return NextResponse.json({ error: 'Unknown tier' }, { status: 404 })
      }
      return NextResponse.json({
        kind,
        tier,
        name: match.name,
        amount: match.price,
      })
    }

    if (kind === 'product') {
      const productId = String(body.productId ?? '').trim()
      const cfg = await getCatalogConfig()
      const allowed = new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds])
      if (!productId || !allowed.has(productId)) {
        return NextResponse.json({ error: 'Product not available' }, { status: 404 })
      }
      const catalog = await fetchCatalogProductPrice(productId)
      if (!catalog) return NextResponse.json({ error: 'Price unavailable' }, { status: 404 })
      return NextResponse.json({
        kind,
        productId,
        name: catalog.name,
        amount: catalog.price,
      })
    }

    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  } catch (err) {
    console.error('/api/checkout/quote', err)
    return NextResponse.json({ error: 'Quote failed' }, { status: 500 })
  }
}
