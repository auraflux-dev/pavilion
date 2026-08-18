import type { MetadataRoute } from 'next'
import { publicSiteUrl } from '@/lib/demo/instance'

const siteUrl = publicSiteUrl()

/** Public marketing pages only. no /staff, /member-portal, or auth. */
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
