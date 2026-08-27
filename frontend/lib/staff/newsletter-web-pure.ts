/**
 * Pure helpers for public newsletter web URLs (safe for client components).
 */
import { newsletterSiteOrigin } from './newsletter-site'

/** Stable URL slug from subject + publish date (UTC). */
export function slugifyNewsletterTitle(title: string, at: Date = new Date()): string {
  const base =
    String(title ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'newsletter'
  const y = at.getUTCFullYear()
  const m = String(at.getUTCMonth() + 1).padStart(2, '0')
  const d = String(at.getUTCDate()).padStart(2, '0')
  return `${base}-${y}${m}${d}`
}

/** Safe public slug (no path traversal). */
export function normalizeNewsletterWebSlug(raw: string): string | null {
  const slug = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (!slug || slug.length > 80) return null
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  return slug
}

export function newsletterWebPublicPath(slug: string): string {
  return `/newsletters/${slug}`
}

export function newsletterWebPublicUrl(slug: string): string {
  return `${newsletterSiteOrigin()}${newsletterWebPublicPath(slug)}`
}

export function newsletterWebHtmlKey(slug: string): string {
  return `newsletter-web/${slug}.html`
}

export function newsletterWebMetaKey(slug: string): string {
  return `newsletter-web/${slug}.json`
}

export type NewsletterWebMeta = {
  slug: string
  title: string
  publishedAt: string
  publishedByEmail: string
}
