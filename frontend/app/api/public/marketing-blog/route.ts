import { NextResponse } from 'next/server'
import { pavilionCmsEnabled } from '@/lib/cms/store'
import {
  listMarketingBlogPosts,
  marketingBlogOrgId,
  seedMarketingBlogIfEmpty,
} from '@/lib/cms/marketing-blog'

export const revalidate = 60

/** Public list of published Pavilion marketing blog posts for www.onpavilion.com. */
export async function GET() {
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ posts: [], source: 'unavailable' })
  }
  try {
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    await ensureCommonsReady()
    const orgId = marketingBlogOrgId()
    await seedMarketingBlogIfEmpty(orgId)
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
    })
  } catch {
    return NextResponse.json({ posts: [], source: 'error' }, { status: 500 })
  }
}
