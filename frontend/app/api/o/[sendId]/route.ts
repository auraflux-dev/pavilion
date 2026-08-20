import { NextRequest, NextResponse } from 'next/server'
import { recordNewsletterOpen } from '@/lib/staff/newsletter-tracking'

export const dynamic = 'force-dynamic'

/** 1×1 transparent GIF for optional open tracking. */
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64',
)

type Ctx = { params: Promise<{ sendId: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { sendId } = await ctx.params
  if (sendId?.trim()) {
    try {
      await recordNewsletterOpen(sendId.trim())
    } catch (err) {
      console.error('/api/o open pixel', err)
    }
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
