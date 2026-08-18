import type { MetadataRoute } from 'next'
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'

const siteUrl = publicSiteUrl()

export default function robots(): MetadataRoute.Robots {
  if (isDemoInstance()) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: siteUrl,
    }
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/staff',
          '/staff/',
          '/api/',
          '/auth/',
          '/member-portal',
          '/member-portal/',
          '/brand',
          '/brand/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
