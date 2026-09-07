/**
 * Brand packs allowed on the public demo picker / ?brand= cookie path.
 * Named prospect packs (e.g. spring-hill) stay sales/trial-host only.
 */
export const DEMO_PUBLIC_BRAND_SLUGS = ['vanilla'] as const

export type DemoPublicBrandSlug = (typeof DEMO_PUBLIC_BRAND_SLUGS)[number]

export function isDemoPublicBrandSlug(slug: string): boolean {
  const key = (slug || '').trim().toLowerCase()
  return (DEMO_PUBLIC_BRAND_SLUGS as readonly string[]).includes(key)
}
