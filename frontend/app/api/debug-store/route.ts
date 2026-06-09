import { NextResponse } from 'next/server'
import { getStoreItems } from '@/lib/api/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await getStoreItems()
    return NextResponse.json({
      source: 'wix-stores-catalog-v3',
      count: items.length,
      items: items.map(i => ({ id: i._id, name: i.name, price: i.price, image: i.image ?? null, featured: i.featured })),
      hasApiKey: !!process.env.WIX_API_KEY,
      hasSiteId: !!process.env.WIX_SITE_ID,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      hasApiKey: !!process.env.WIX_API_KEY,
      hasSiteId: !!process.env.WIX_SITE_ID,
    })
  }
}
