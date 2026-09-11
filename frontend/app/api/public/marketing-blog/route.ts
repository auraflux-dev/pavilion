import { NextRequest, NextResponse } from 'next/server'
import { pavilionCmsEnabled } from '@/lib/cms/store'
import {
  listMarketingBlogPosts,
  marketingBlogOrgId,
  parseMarketingBlogProduct,
  seedMarketingBlogIfEmpty,
} from '@/lib/cms/marketing-blog'

export const revalidate = 60

/** Public list of published marketing blog posts. ?product=pavilion|businessrocket|auraflux */
export async function GET(req: NextRequest) {
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ posts: [], source: 'unavailable' })
  }
  try {
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    await ensureCommonsReady()
    const product = parseMarketingBlogProduct(req.nextUrl.searchParams.get('product'))
    const orgId = marketingBlogOrgId(product)
    await seedMarketingBlogIfEmpty(orgId, product)
    const posts = await listMarketingBlogPosts(orgId, { activeOnly: true })
    return NextResponse.json({
      posts: posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        date: p.date,
        category: p.category,
        excerpt: p.excerpt,
        minutes: p.minutes,
        bodyMarkdown: p.bodyMarkdown,
      })),
      source: 'cms',
      product,
    })
  } catch {
    return NextResponse.json({ posts: [], source: 'error' }, { status: 500 })
  }
}
