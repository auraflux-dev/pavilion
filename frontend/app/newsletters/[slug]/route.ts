import { NextRequest, NextResponse } from 'next/server'
import {
  getNewsletterWebHtml,
  normalizeNewsletterWebSlug,
} from '@/lib/staff/newsletter-web'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ slug: string }> }

/** Public on-site newsletter (shareable link for school Scoop). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug: raw } = await ctx.params
  const slug = normalizeNewsletterWebSlug(decodeURIComponent(raw ?? ''))
  if (!slug) {
    return new NextResponse('Newsletter not found', { status: 404 })
  }
  const html = await getNewsletterWebHtml(slug)
  if (!html) {
    return new NextResponse('Newsletter not found', { status: 404 })
  }
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'X-Robots-Tag': 'index, follow',
    },
  })
}
