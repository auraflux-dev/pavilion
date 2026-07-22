import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(
  /\/$/,
  '',
)

/** Public marketing pages only — no /staff, /member-portal, or auth. */
const PUBLIC_PATHS = [
  '/',
  '/programs',
  '/events',
  '/membership',
  '/cove',
  '/volunteer',
  '/fundraising',
  '/board',
  '/meetings',
  '/contact',
  '/newsletter',
  '/spirit-wear',
  '/store',
  '/privacy',
  '/terms',
  '/data-security',
  '/photo-release',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PUBLIC_PATHS.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/membership' || path === '/programs' ? 0.9 : 0.7,
  }))
}
