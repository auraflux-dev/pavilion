'use client'

/** Client helper — opens headless Wix checkout in a new tab. */
export async function startWixCheckout(body: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/checkout/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { checkoutUrl?: string; error?: string }
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data.error || 'Checkout unavailable')
  }
  window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
}
