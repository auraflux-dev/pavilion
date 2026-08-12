/**
 * GET /api/catalog/product/[id]
 * Public catalog detail (variants + prices) for allowlisted store / spirit products.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { fetchCatalogProductDetail } from '@/lib/catalog-price'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const productId = String(id ?? '').trim()
    if (!productId) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 })
    }

    const cfg = await getCatalogConfig()
    const allowed = new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds])
    if (!allowed.has(productId)) {
      return NextResponse.json({ error: 'Product not available' }, { status: 404 })
    }

    const detail = await fetchCatalogProductDetail(productId)
    if (!detail) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(detail, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('/api/catalog/product/[id]', err)
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 })
  }
}
