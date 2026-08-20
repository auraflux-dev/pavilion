/**
 * Knowledge base articles from Wix KbArticles, merged over code defaults.
 * Staff edits in Staff → Help (KbArticles collection). No deploy needed for copy changes.
 */
import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { humanizePublicCopy } from '@/lib/copy/humanize-public-copy'
import { MEMBER_KB } from '@/lib/kb/member'
import { STAFF_KB } from '@/lib/kb/staff'
import { vanillaizeCopy } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import type { KbArticle, KbAudience, KbCategory, StaffKbNeed } from '@/lib/kb/types'

type CmsRow = {
  id?: string
  data?: {
    audience?: string
    categoryId?: string
    slug?: string
    title?: string
    summary?: string
    body?: string
    order?: number
    adminOnly?: boolean
    need?: string
    active?: boolean
  }
}

function normalizeNeed(raw: string | undefined): StaffKbNeed | undefined {
  const v = (raw || '').trim().toLowerCase()
  if (!v || v === 'none') return undefined
  if (v === 'message' || v === 'membership' || v === 'discounts' || v === 'site' || v === 'marketing') {
    return v
  }
  return undefined
}

function fromCms(row: CmsRow, audience: KbAudience): KbArticle | null {
  const d = row.data
  if (!d?.slug?.trim() || !d?.title?.trim() || !d?.body?.trim()) return null
  if ((d.audience || '').trim() !== audience) return null
  if (d.active === false) return null

  const title = audience === 'member' ? humanizePublicCopy(d.title) : d.title.trim()
  const summary = audience === 'member' ? humanizePublicCopy(d.summary || '') : (d.summary || '').trim()
  const body = audience === 'member' ? humanizePublicCopy(d.body) : d.body.trim()

  return {
    slug: d.slug.trim(),
    title,
    categoryId: (d.categoryId || 'programs').trim(),
    summary,
    body,
    order: typeof d.order === 'number' ? d.order : 99,
    adminOnly: Boolean(d.adminOnly),
    need: normalizeNeed(d.need),
  }
}

async function fetchCmsArticles(audience: KbAudience): Promise<KbArticle[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  try {
    const { fetchWithRetry } = await import('@/lib/fetch-with-retry')
    const res = await fetchWithRetry('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'KbArticles',
        query: {
          filter: {
            audience: { $eq: audience },
            active: { $eq: true },
          },
          sort: [{ fieldName: 'order', order: 'ASC' }],
          paging: { limit: 200 },
        },
      }),
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { dataItems?: CmsRow[] }
    return (data.dataItems ?? [])
      .map((row) => fromCms(row, audience))
      .filter((a): a is KbArticle => {
        if (!a) return false
        return !isCmsQaItem(a.title, a.summary, a.body, a.slug)
      })
  } catch {
    return []
  }
}

function defaultsFor(audience: KbAudience) {
  return audience === 'staff' ? STAFF_KB : MEMBER_KB
}

function vanillaizeArticles(articles: KbArticle[]): KbArticle[] {
  if (!isDemoInstance()) return articles
  return articles.map((article) => ({
    ...article,
    title: vanillaizeCopy(article.title),
    summary: vanillaizeCopy(article.summary),
    body: vanillaizeCopy(article.body),
  }))
}

/** Merge CMS overrides onto code defaults (CMS wins by slug). CMS-only articles append. */
export async function getMergedKbArticles(audience: KbAudience): Promise<KbArticle[]> {
  const base = defaultsFor(audience).articles
  if (isDemoInstance()) return vanillaizeArticles([...base])
  const cms = await fetchCmsArticles(audience)
  if (!cms.length) return [...base]

  const bySlug = new Map(cms.map((a) => [a.slug, a]))
  const merged = base.map((a) => bySlug.get(a.slug) ?? a)
  const baseSlugs = new Set(base.map((a) => a.slug))
  for (const extra of cms) {
    if (!baseSlugs.has(extra.slug)) merged.push(extra)
  }
  return merged.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export async function getMergedKbCategories(audience: KbAudience): Promise<KbCategory[]> {
  const categories = [...defaultsFor(audience).categories].sort((a, b) => a.order - b.order)
  if (!isDemoInstance()) return categories
  return categories.map((category) => ({
    ...category,
    title: vanillaizeCopy(category.title),
    summary: vanillaizeCopy(category.summary),
  }))
}

export async function getMergedKbArticle(
  audience: KbAudience,
  slug: string,
): Promise<KbArticle | null> {
  const articles = await getMergedKbArticles(audience)
  return articles.find((a) => a.slug === slug) ?? null
}

export function defaultKbArticles(audience: KbAudience): KbArticle[] {
  return [...defaultsFor(audience).articles]
}
