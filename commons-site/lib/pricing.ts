/**
 * Mirror of frontend/lib/demo/review-links.ts and ops pricing.
 * Keep demo origin in sync when changing hosts.
 */
import { CONTACT_EMAIL } from '@/lib/brand'

export { CONTACT_EMAIL }

export const COMMONS_LIST_PRICE_USD = 399
export const ADDON_STORE_USD = 99
export const ADDON_CREATIVE_USD = 99

/** Public always-on demo. No review code required. */
export const DEMO_URL = 'https://demo.onpavilion.com'

/** Staff / member portal tour (review code entered on page or from sales link). */
export const DEMO_TOUR_URL = 'https://demo.onpavilion.com/review'

/** Legacy Vercel host until demo.onpavilion.com DNS is live. */
export const DEMO_URL_LEGACY = 'https://commons-pto-demo.vercel.app'
