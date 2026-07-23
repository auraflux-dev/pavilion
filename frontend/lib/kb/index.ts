import { MEMBER_KB } from './member'
import { STAFF_KB } from './staff'
import type { KbArticle, KbAudience, KbCategory, KbIndex, StaffKbNeed } from './types'

export type { KbArticle, KbAudience, KbCategory, KbIndex, StaffKbNeed }

function indexFor(audience: KbAudience): KbIndex {
  return audience === 'staff' ? STAFF_KB : MEMBER_KB
}

export function listCategories(audience: KbAudience): KbCategory[] {
  return [...indexFor(audience).categories].sort((a, b) => a.order - b.order)
}

export function listArticles(
  audience: KbAudience,
  opts?: {
    categoryId?: string
    isAdmin?: boolean
    canMessage?: boolean
    canMembership?: boolean
    canDiscounts?: boolean
    canSite?: boolean
    canMarketing?: boolean
  },
): KbArticle[] {
  let articles = [...indexFor(audience).articles]

  if (audience === 'staff') {
    articles = articles.filter((a) => {
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
    articles = articles.filter((a) => a.categoryId === opts.categoryId)
  }

  return articles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export function getArticle(audience: KbAudience, slug: string): KbArticle | null {
  return indexFor(audience).articles.find((a) => a.slug === slug) ?? null
}

export function getCategory(audience: KbAudience, id: string): KbCategory | null {
  return indexFor(audience).categories.find((c) => c.id === id) ?? null
}

export function articlesByCategory(
  audience: KbAudience,
  opts?: Parameters<typeof listArticles>[1],
): { category: KbCategory; articles: KbArticle[] }[] {
  const categories = listCategories(audience)
  const articles = listArticles(audience, opts)
  return categories
    .map((category) => ({
      category,
      articles: articles.filter((a) => a.categoryId === category.id),
    }))
    .filter((group) => group.articles.length > 0)
}
