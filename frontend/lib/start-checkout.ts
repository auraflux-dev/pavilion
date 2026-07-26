'use client'

const COUPON_KEY = 'checkoutCouponCode'

/** Client helper. opens headless Wix checkout in a new tab. */
export async function startWixCheckout(body: Record<string, unknown>): Promise<void> {
  const couponFromBody = typeof body.couponCode === 'string' ? body.couponCode.trim() : ''
  const coupon =
    couponFromBody ||
    (typeof window !== 'undefined' ? sessionStorage.getItem(COUPON_KEY)?.trim() || '' : '')

  const res = await fetch('/api/checkout/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      ...(coupon ? { couponCode: coupon.toUpperCase() } : {}),
    }),
  })
  const data = (await res.json()) as { checkoutUrl?: string; error?: string }
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data.error || 'Checkout unavailable')
  }
  window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
}

export function getStoredCouponCode(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(COUPON_KEY)?.trim() || ''
}

export function setStoredCouponCode(code: string): void {
  if (typeof window === 'undefined') return
  const normalized = code.trim().toUpperCase()
  if (normalized) sessionStorage.setItem(COUPON_KEY, normalized)
  else sessionStorage.removeItem(COUPON_KEY)
}
