import 'server-only'

import { randomUUID } from 'crypto'
import { marketingBlogOrgId, slugifyBlogTitle, upsertMarketingBlogPost } from '@/lib/cms/marketing-blog'
import type { CompanyProduct } from '@/lib/crm/platform-owners'
import type { ContentIdea, GscQueryRow, WorkspaceBundle } from '@/lib/staff/seo/workspace'
import { saveWorkspaceBundle } from '@/lib/staff/seo/store'

/** Turn GSC queries into content ideas and optional unpublished blog drafts. */
export async function seedContentIdeas(opts: {
  bundle: WorkspaceBundle
  rows: GscQueryRow[]
  product: CompanyProduct
  publishBlogDrafts?: boolean
}): Promise<{ ideas: ContentIdea[]; seeded: number }> {
  const ideas: ContentIdea[] = opts.rows.slice(0, 12).map((row) => ({
    id: `idea_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
    query: row.query,
    impressions: row.impressions,
    clicks: row.clicks,
    position: row.position,
    reason: row.position > 10 ? 'Opportunity query (page 2+)' : 'Already ranking. Reinforce with a calendar piece.',
    status: 'idea',
    createdAt: new Date().toISOString(),
  }))
  opts.bundle.ideas = [...ideas, ...opts.bundle.ideas].slice(0, 40)
  await saveWorkspaceBundle(opts.bundle)

  let seeded = 0
  if (opts.publishBlogDrafts) {
    const orgId = marketingBlogOrgId(opts.product)
    for (const idea of ideas.slice(0, 5)) {
      const title = idea.query.slice(0, 80)
      const slug = slugifyBlogTitle(`seo-${title}`)
      if (!slug) continue
      await upsertMarketingBlogPost(
        {
          slug,
          title,
          date: new Date().toISOString().slice(0, 10),
          category: 'SEO',
          excerpt: idea.reason,
          bodyMarkdown: `Draft from Search Console query: ${idea.query}\n\nWrite the public piece in Brand Staff → Blog.`,
          active: false,
        },
        orgId,
      )
      idea.status = 'planned'
      seeded += 1
    }
    await saveWorkspaceBundle(opts.bundle)
  }
  return { ideas: opts.bundle.ideas, seeded }
}
