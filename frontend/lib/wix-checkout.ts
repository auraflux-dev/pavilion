/**
 * Wix Stores checkout URL builder.
 * Product IDs are stable — hardcoded here so no extra API call is needed at render time.
 *
 * Until the custom domain DNS points at Vercel (and Wix product routes are wired through
 * that host), we use the live Wix storefront base. After DNS, set
 * NEXT_PUBLIC_STORE_BASE_URL=https://www.shmspto.org/store (or product-page root)
 * in Vercel to flip links to the canonical domain without a code change.
 */

export const WIX_SITE_ID_CANONICAL = '509fda24-8dbf-43c6-aa74-df9f8b63c388'

/** Hosted Wix storefront (transfered headless site) — before primary DNS cutover */
export const WIX_STORE_BASE_URL = 'https://treasurer7596.wixsite.com/shms-pto-2026'

export const STORE_CARD_PRODUCT_ID = 'eb2a71dc-7f0f-41b4-85bc-76b0869e5d30'
export const STORE_CARD_SLUG = 'pto-store-card'

export const MEMBERSHIP_RUBY_PRODUCT_ID = '89ad5f10-a4bc-4a31-af4a-22b6add4cad4'
export const MEMBERSHIP_RUBY_SLUG = 'pto-membership-ruby-1'
export const MEMBERSHIP_SUPREME_PRODUCT_ID = '58f334f3-32d7-4d38-9639-7e587a38a26f'
export const MEMBERSHIP_SUPREME_SLUG = 'pto-membership-supreme-1'

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

/**
 * Returns the Wix storefront product page URL for a store card variant.
 * Until Wix Headless checkout is fully configured, this links to the hosted
 * Wix storefront product page where the parent selects the amount and checks out.
 */
/** @deprecated Prefer /api/checkout/start — product-page URLs 404 on this site. */
export function storeCardCheckoutUrl(amount: 10 | 20 | 25 | null): string {
  const base = productPageUrl(STORE_CARD_SLUG)
  if (!amount) return base
  const param = encodeURIComponent(`Amount:$${amount}`)
  return `${base}?options=${param}`
}

export function membershipCheckoutUrl(tierId: 'ruby' | 'supreme' | string): string {
  if (tierId === 'supreme') return productPageUrl(MEMBERSHIP_SUPREME_SLUG)
  if (tierId === 'ruby') return productPageUrl(MEMBERSHIP_RUBY_SLUG)
  return '/membership'
}
