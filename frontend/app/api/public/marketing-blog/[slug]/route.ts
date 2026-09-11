import { NextResponse } from 'next/server'
import { pavilionCmsEnabled } from '@/lib/cms/store'
import {
  getMarketingBlogPost,
  marketingBlogOrgId,
  seedMarketingBlogIfEmpty,
} from '@/lib/cms/marketing-blog'

export const revalidate = 60

type Ctx = { params: Promise<{ slug: string }> }

/** Public single published Pavilion marketing blog post. */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params
  if (!pavilionCmsEnabled()) {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  }
  try {
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    await ensureCommonsReady()
    const orgId = marketingBlogOrgId()
    await seedMarketingBlogIfEmpty(orgId)
    const post = await getMarketingBlogPost(slug, orgId, { activeOnly: true })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      post: {
        slug: post.slug,
        title: post.title,
        date: post.date,
        category: post.category,
        excerpt: post.excerpt,
        minutes: post.minutes,
        bodyMarkdown: post.bodyMarkdown,
      },
      source: 'cms',
    })
  } catch {
    return NextResponse.json({ error: 'Unavailable' }, { status: 500 })
  }
}
