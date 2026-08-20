import { NextRequest, NextResponse } from 'next/server'
import {
  getNewsletterHeroPng,
  normalizeNewsletterAssetKey,
} from '@/lib/staff/newsletter-assets'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ key: string }> }

/** Public durable PNG for newsletter heroes (re-hosted Canva exports). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { key: raw } = await ctx.params
  const key = normalizeNewsletterAssetKey(decodeURIComponent(raw ?? ''))
  if (!key) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const png = await getNewsletterHeroPng(key)
  if (!png) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
