export type KbAudience = 'member' | 'staff'

export type StaffKbNeed = 'message' | 'membership' | 'discounts' | 'site' | 'marketing' | 'retail'

export type KbCategory = {
  id: string
  title: string
  summary: string
  order: number
}

export type KbArticle = {
  slug: string
  title: string
  categoryId: string
  summary: string
  /** Plain article body. paragraphs, ## headings, - lists, **bold**, ![alt](/path.png) images. */
  body: string
  order: number
  /** Staff-only gates (ignored for member KB). */
  adminOnly?: boolean
  need?: StaffKbNeed
}

export type KbIndex = {
  audience: KbAudience
  categories: KbCategory[]
  articles: KbArticle[]
}
