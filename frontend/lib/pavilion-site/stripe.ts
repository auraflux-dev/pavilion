/** HSKRG LLC Stripe for Pavilion SaaS. Not school Square. */
import 'server-only'
import Stripe from 'stripe'

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
  )
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  // Use account default API version from the installed SDK.
  return new Stripe(key)
}

export function commonsPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID?.trim()
  if (!id) throw new Error('STRIPE_PRICE_ID missing')
  return id
}

export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}
