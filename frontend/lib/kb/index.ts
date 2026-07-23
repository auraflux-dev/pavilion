import { MEMBER_KB } from './member'
import { STAFF_KB } from './staff'
import type { KbArticle, KbAudience, KbCategory, KbIndex, StaffKbNeed } from './types'

export type { KbArticle, KbAudience, KbCategory, KbIndex, StaffKbNeed }

export type KbGateOpts = {
  categoryId?: string
  isAdmin?: boolean
  canMessage?: boolean
  canMembership?: boolean
  canDiscounts?: boolean
  canSite?: boolean
  canMarketing?: boolean
}

function indexFor(audience: KbAudience): KbIndex {
  return audience === 'staff' ? STAFF_KB : MEMBER_KB
}

export function listCategories(audience: KbAudience): KbCategory[] {
  return [...indexFor(audience).categories].sort((a, b) => a.order - b.order)
}

export function filterArticles(
  audience: KbAudience,
  articles: KbArticle[],
  opts?: KbGateOpts,
): KbArticle[] {
  let list = [...articles]

  if (audience === 'staff') {
    list = list.filter((a) => {
      if (a.adminOnly && !opts?.isAdmin) return false
      if (a.need === 'message' && !opts?.canMessage) return false
      if (a.need === 'membership' && !opts?.canMembership) return false
      if (a.need === 'discounts' && !opts?.canDiscounts) return false
      if (a.need === 'site' && !opts?.canSite) return false
      if (a.need === 'marketing' && !opts?.canMarketing) return false
      return true
    })
  }

  if (opts?.categoryId) {
    list = list.filter((a) => a.categoryId === opts.categoryId)
  }

  return list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

/** Sync code-defaults only (no CMS). Prefer async helpers in lib/api/kb-articles for live Help. */
export function listArticles(audience: KbAudience, opts?: KbGateOpts): KbArticle[] {
  return filterArticles(audience, indexFor(audience).articles, opts)
}

export function getArticle(audience: KbAudience, slug: string): KbArticle | null {
  return indexFor(audience).articles.find((a) => a.slug === slug) ?? null
}

export function getCategory(audience: KbAudience, id: string): KbCategory | null {
  return indexFor(audience).categories.find((c) => c.id === id) ?? null
}

export function articlesByCategory(
  audience: KbAudience,
  opts?: KbGateOpts,
  articles?: KbArticle[],
): { category: KbCategory; articles: KbArticle[] }[] {
  const categories = listCategories(audience)
  const list = filterArticles(audience, articles ?? indexFor(audience).articles, opts)
  return categories
    .map((category) => ({
      category,
      articles: list.filter((a) => a.categoryId === category.id),
    }))
    .filter((group) => group.articles.length > 0)
}

/** Group unknown categoryIds (CMS-only) under a catch-all when needed. */
export function articlesByCategoryWithExtras(
  audience: KbAudience,
  articles: KbArticle[],
  opts?: KbGateOpts,
): { category: KbCategory; articles: KbArticle[] }[] {
  const groups = articlesByCategory(audience, opts, articles)
  const known = new Set(listCategories(audience).map((c) => c.id))
  const extras = filterArticles(audience, articles, opts).filter((a) => !known.has(a.categoryId))
  if (!extras.length) return groups
  return [
    ...groups,
    {
      category: {
        id: 'more',
        title: 'More',
        summary: 'Additional articles',
        order: 99,
      },
      articles: extras,
    },
  ]
}
