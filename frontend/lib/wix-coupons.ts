/**
 * Create / manage Wix Coupons used at headless checkout.
 * Store-card checkouts lock coupons off so these never apply to card loads.
 */
const COUPONS_URL = 'https://www.wixapis.com/stores/v2/coupons'

function headers() {
 const apiKey = process.env.WIX_API_KEY
 const siteId = process.env.WIX_SITE_ID
 if (!apiKey || !siteId) throw new Error('WIX_API_KEY and WIX_SITE_ID required')
 return {
 Authorization: apiKey,
 'wix-site-id': siteId,
    'Content-Type': 'application/json',
 }
}

export type CreateWixCouponInput = {
 name: string
 code: string
 percentOffRate: number
 usageLimit?: number | null
 limitPerCustomer?: number | null
 expirationTimeMs?: number | null
}

export async function createWixPercentCoupon(input: CreateWixCouponInput): Promise<{
 id: string
 code: string
}> {
 const percent = Math.round(input.percentOffRate)
 if (percent < 5 || percent > 75) {
 throw new Error('Discount percent must be between 5 and 75')
 }
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '')
 if (!code || code.length > 20) {
 throw new Error('Code must be 1 to 20 characters (letters/numbers)')
 }

 const specification: Record<string, unknown> = {
 name: input.name.trim() || code,
 code,
 percentOffRate: percent,
 scope: { namespace: 'stores' },
 startTime: String(Date.now()),
 active: true,
 limitedToOneItem: false,
 }
 if (input.usageLimit != null && input.usageLimit > 0) {
 specification.usageLimit = input.usageLimit
 }
 if (input.limitPerCustomer != null && input.limitPerCustomer > 0) {
 specification.limitPerCustomer = input.limitPerCustomer
 }
 if (input.expirationTimeMs != null && input.expirationTimeMs > Date.now()) {
 specification.expirationTime = String(input.expirationTimeMs)
 }

 const res = await fetch(COUPONS_URL, {
 method: 'POST',
 headers: headers(),
 body: JSON.stringify({ specification }),
 })
 if (!res.ok) {
 const text = await res.text()
 throw new Error(`Wix coupon create failed (${res.status}): ${text.slice(0, 400)}`)
 }
 const data = await res.json()
 const id = String(data.coupon?.id ?? data.id ?? '')
 if (!id) throw new Error('Wix coupon created without id')
 return { id, code }
}

export async function deactivateWixCoupon(couponId: string): Promise<void> {
 if (!couponId) return
 const res = await fetch(`${COUPONS_URL}/${couponId}`, {
 method: 'PATCH',
 headers: headers(),
 body: JSON.stringify({
 specification: { active: false },
 fieldMask: { paths: ['active'] },
 }),
 })
 if (!res.ok) {
 // Fallback: try delete
 await fetch(`${COUPONS_URL}/${couponId}`, {
 method: 'DELETE',
 headers: headers(),
 }).catch(() => {})
 }
}
