/**
 * Wix Stores checkout helpers.
 * Stable UUID defaults live in lib/defaults/catalog.ts. prefer getCatalogConfig()
 * for runtime so Wix SiteSettings can override without a deploy.
 */
import { CATALOG_DEFAULTS } from '@/lib/defaults/catalog'

export const WIX_SITE_ID_CANONICAL = '509fda24-8dbf-43c6-aa74-df9f8b63c388'

/** Hosted Wix storefront (transferred headless site). before primary DNS cutover */
export const WIX_STORE_BASE_URL = 'https://treasurer7596.wixsite.com/shms-pto-2026'

/** @deprecated Prefer getCatalogConfig().storeCardProductId */
export const STORE_CARD_PRODUCT_ID = CATALOG_DEFAULTS.storeCardProductId
export const STORE_CARD_SLUG = CATALOG_DEFAULTS.storeCardSlug

/** @deprecated Prefer getCatalogConfig().rubyProductId */
export const MEMBERSHIP_RUBY_PRODUCT_ID = CATALOG_DEFAULTS.membershipRubyProductId
export const MEMBERSHIP_RUBY_SLUG = CATALOG_DEFAULTS.membershipRubySlug
/** @deprecated Prefer getCatalogConfig().supremeProductId */
export const MEMBERSHIP_SUPREME_PRODUCT_ID = CATALOG_DEFAULTS.membershipSupremeProductId
export const MEMBERSHIP_SUPREME_SLUG = CATALOG_DEFAULTS.membershipSupremeSlug

/**
 * Base path for product pages.
 * Override with NEXT_PUBLIC_STORE_BASE_URL (e.g. https://www.shmspto.org/store)
 * once the primary domain is live on Vercel + Wix product paths resolve there.
 */
export function getStorefrontBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_STORE_BASE_URL?.replace(/\/$/, '')
 if (override) return override
  return `${WIX_STORE_BASE_URL}/product-page`
}

/** Wix hosted product page for a catalog product slug. */
export function productPageUrl(slug: string): string {
 return `${getStorefrontBaseUrl()}/${slug}`
}

/** @deprecated Prefer /api/checkout/start. product-page URLs 404 on this site. */
export function storeCardCheckoutUrl(amount: number | null): string {
 const base = productPageUrl(STORE_CARD_SLUG)
 if (!amount) return base
 const param = encodeURIComponent(`Amount:$${amount}`)
 return `${base}?options=${param}`
}

export function membershipCheckoutUrl(tierId: 'ruby' | 'supreme' | string): string {
 if (tierId === 'supreme') return productPageUrl(MEMBERSHIP_SUPREME_SLUG)
 if (tierId === 'ruby') return productPageUrl(MEMBERSHIP_RUBY_SLUG)
  return '/membership#choose'
}
