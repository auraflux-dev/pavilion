import { NextResponse } from 'next/server'
import { getStoreItems, getFeaturedItems } from '@/lib/api/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { getWixClient } = await import('@/lib/wix-client')
    const client = getWixClient()
    const result = await client.items.query('StoreItems').find()
    const first = result.items?.[0] as Record<string, unknown> | undefined;
    return NextResponse.json({
      allCount: result.items?.length ?? 0,
      firstItemKeys: first ? Object.keys(first) : [],
      firstItem: first,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      WIX_SITE_ID: process.env.WIX_SITE_ID,
      hasApiKey: !!process.env.WIX_API_KEY,
      apiKeyPrefix: process.env.WIX_API_KEY?.substring(0, 20),
    })
  }
}
