/**
 * Wix Stores checkout URL builder.
 * Product IDs are stable — hardcoded here so no extra API call is needed at render time.
 */

export const WIX_STORE_BASE_URL = `https://shmspto.wixsite.com/509fda24-8dbf-43c6-aa74-df9f8b63c388`

export const STORE_CARD_PRODUCT_ID = 'eb2a71dc-7f0f-41b4-85bc-76b0869e5d30'
export const STORE_CARD_SLUG = 'pto-store-card'

/**
 * Returns the Wix storefront product page URL for a store card variant.
 * The variant is pre-selected via the `options` query param Wix appends when
 * a specific choice is selected in the storefront.
 *
 * Until Wix Headless checkout is fully configured, this links to the hosted
 * Wix storefront product page where the parent selects the amount and checks out.
 */
export function storeCardCheckoutUrl(amount: 10 | 20 | 25 | null): string {
  // Wix hosted storefront product page — works before headless checkout is wired
  const base = `https://www.shmspto.org/store/product/${STORE_CARD_SLUG}/${STORE_CARD_PRODUCT_ID}`
  if (!amount) return base
  // Wix storefront accepts ?options=Amount%3A%2410 to pre-select the variant
  const param = encodeURIComponent(`Amount:$${amount}`)
  return `${base}?options=${param}`
}
