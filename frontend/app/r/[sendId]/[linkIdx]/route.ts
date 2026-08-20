import { NextRequest, NextResponse } from 'next/server'
import { recordNewsletterClick } from '@/lib/staff/newsletter-tracking'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ sendId: string; linkIdx: string }> }

/** Public click tracker → redirect to the original URL (with UTM already applied). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { sendId, linkIdx } = await ctx.params
  const idx = Number.parseInt(String(linkIdx ?? ''), 10)
  if (!sendId?.trim() || Number.isNaN(idx) || idx < 0) {
    return NextResponse.redirect('https://www.shmspto.org/', 302)
  }

  try {
    const url = await recordNewsletterClick(sendId.trim(), idx)
    if (url) return NextResponse.redirect(url, 302)
  } catch (err) {
    console.error('/r click tracker', err)
  }
  return NextResponse.redirect('https://www.shmspto.org/', 302)
}
