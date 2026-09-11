import 'server-only'

/**
 * Org-scoped marketing blog posts (Staff Blog + public /blog when enabled).
 * Stored in cms_collection_items collection MarketingBlogPosts.
 */
import { randomUUID } from 'crypto'
import { sqlForOrg } from '@/lib/crm/tenant'
import {
  platformHomeOrgId,
  type CompanyProduct,
  normalizeCompanyProduct,
} from '@/lib/crm/platform-owners'
import { MARKETING_BLOG_SEED } from '@/lib/cms/marketing-blog-seed'

export const MARKETING_BLOG_COLLECTION = 'MarketingBlogPosts'

export function marketingBlogOrgId(product: CompanyProduct = 'pavilion'): string {
  return platformHomeOrgId(normalizeCompanyProduct(product))
}

export function parseMarketingBlogProduct(raw: string | null | undefined): CompanyProduct {
  return normalizeCompanyProduct(raw)
}

export type MarketingBlogPost = {
  id: string
  slug: string
  title: string
  date: string
  category: string
  excerpt: string
  minutes: number
  bodyMarkdown: string
  active: boolean
  sortOrder: number
  updatedAt: string
}

type CollectionRow = {
  id: string
  sort_order: number
  data_json: string
  active: boolean
  updated_at: string
}

export function slugifyBlogTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function parsePayload(raw: string): Partial<MarketingBlogPost> {
  try {
    const data = JSON.parse(raw || '{}') as Record<string, unknown>
    return {
      slug: String(data.slug ?? '').trim(),
      title: String(data.title ?? '').trim(),
      date: String(data.date ?? '').trim(),
      category: String(data.category ?? '').trim(),
      excerpt: String(data.excerpt ?? '').trim(),
      minutes: Number(data.minutes ?? 3) || 3,
      bodyMarkdown: String(data.bodyMarkdown ?? '').trim(),
    }
  } catch {
    return {}
  }
}

function rowToPost(row: CollectionRow): MarketingBlogPost | null {
  const data = parsePayload(row.data_json)
  if (!data.slug || !data.title || !data.date || !data.category || !data.excerpt) return null
  return {
    id: row.id,
    slug: data.slug,
    title: data.title,
    date: data.date,
    category: data.category,
    excerpt: data.excerpt,
    minutes: data.minutes && data.minutes > 0 ? data.minutes : 3,
    bodyMarkdown: data.bodyMarkdown || '',
    active: row.active !== false,
    sortOrder: Number(row.sort_order) || 0,
    updatedAt: row.updated_at,
  }
}

export async function listMarketingBlogPosts(
  orgId: string,
  opts?: { activeOnly?: boolean },
): Promise<MarketingBlogPost[]> {
  const activeOnly = opts?.activeOnly === true
  const res = await sqlForOrg<CollectionRow>(
    orgId,
    `select id, sort_order, data_json, active, updated_at::text as updated_at
     from cms_collection_items
     where organization_id = $1 and collection = $2
     ${activeOnly ? 'and active = true' : ''}
     order by sort_order asc, updated_at desc`,
    [orgId, MARKETING_BLOG_COLLECTION],
  )
  return res.rows
    .map(rowToPost)
    .filter((p): p is MarketingBlogPost => Boolean(p))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getMarketingBlogPost(
  slug: string,
  orgId: string,
  opts?: { activeOnly?: boolean },
): Promise<MarketingBlogPost | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safe || safe !== slug) return null
  const posts = await listMarketingBlogPosts(orgId, opts)
  return posts.find((p) => p.slug === safe) ?? null
}

export async function upsertMarketingBlogPost(
  input: {
    id?: string
    slug: string
    title: string
    date: string
    category: string
    excerpt: string
    minutes?: number
    bodyMarkdown?: string
    active?: boolean
    sortOrder?: number
  },
  orgId: string,
): Promise<MarketingBlogPost> {
  const slug = String(input.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) throw new Error('slug required')
  const title = String(input.title ?? '').trim()
  const date = String(input.date ?? '').trim()
  const category = String(input.category ?? '').trim()
  const excerpt = String(input.excerpt ?? '').trim()
  if (!title || !date || !category || !excerpt) {
    throw new Error('title, date, category, and excerpt are required')
  }
  const minutes = Number(input.minutes ?? 3)
  const bodyMarkdown = String(input.bodyMarkdown ?? '').trim()
  const active = input.active !== false
  const sortOrder = Number(input.sortOrder ?? 0) || 0
  const id = String(input.id ?? '').trim() || randomUUID()

  const existing = await listMarketingBlogPosts(orgId, { activeOnly: false })
  const clash = existing.find((p) => p.slug === slug && p.id !== id)
  if (clash) throw new Error(`Slug "${slug}" is already used by another post`)

  const dataJson = JSON.stringify({
    slug,
    title,
    date,
    category,
    excerpt,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 3,
    bodyMarkdown,
  })

  await sqlForOrg(
    orgId,
    `insert into cms_collection_items (
       id, organization_id, collection, sort_order, data_json, active, updated_at
     ) values ($1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set
       sort_order = excluded.sort_order,
       data_json = excluded.data_json,
       active = excluded.active,
       updated_at = now()
     where cms_collection_items.organization_id = $2
       and cms_collection_items.collection = $3`,
    [id, orgId, MARKETING_BLOG_COLLECTION, sortOrder, dataJson, active],
  )

  const saved = await getMarketingBlogPost(slug, orgId, { activeOnly: false })
  if (!saved) throw new Error('Failed to save blog post')
  return saved
}

export async function setMarketingBlogPostActive(
  id: string,
  active: boolean,
  orgId: string,
): Promise<void> {
  const postId = String(id ?? '').trim()
  if (!postId) throw new Error('id required')
  await sqlForOrg(
    orgId,
    `update cms_collection_items
     set active = $3, updated_at = now()
     where organization_id = $1 and collection = $2 and id = $4`,
    [orgId, MARKETING_BLOG_COLLECTION, active, postId],
  )
}

/** Seed the three launch posts when the collection is empty. */
export async function seedMarketingBlogIfEmpty(
  orgId: string,
  product: CompanyProduct = 'pavilion',
): Promise<{ seeded: number }> {
  // Only Pavilion home org gets the launch seed. Other orgs start empty.
  if (product !== 'pavilion' || orgId !== marketingBlogOrgId('pavilion')) {
    return { seeded: 0 }
  }
  const existing = await listMarketingBlogPosts(orgId, { activeOnly: false })
  if (existing.length > 0) return { seeded: 0 }
  let seeded = 0
  for (const [index, post] of MARKETING_BLOG_SEED.entries()) {
    await upsertMarketingBlogPost(
      {
        slug: post.slug,
        title: post.title,
        date: post.date,
        category: post.category,
        excerpt: post.excerpt,
        minutes: post.minutes,
        bodyMarkdown: post.bodyMarkdown,
        active: true,
        sortOrder: index,
      },
      orgId,
    )
    seeded += 1
  }
  return { seeded }
}

export function marketingBlogPublicSite(product: CompanyProduct): string {
  if (product === 'businessrocket') return 'https://www.businessrocket.ai/blog'
  if (product === 'auraflux') return 'https://www.auraflux.co/blog'
  return 'https://www.onpavilion.com/blog'
}
