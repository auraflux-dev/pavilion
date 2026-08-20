/** Public site origin for newsletter links and tracking pixels. */
export function newsletterSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shmspto.org').replace(/\/$/, '')
}
