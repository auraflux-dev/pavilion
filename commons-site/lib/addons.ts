import 'server-only'
import { ADDON_CREATIVE_USD, ADDON_STORE_USD } from '@/lib/pricing'

export type AddonId = 'store' | 'creative'

export function storeAddonPriceId(): string | null {
  return process.env.STRIPE_PRICE_STORE_ID?.trim() || null
}

export function creativeAddonPriceId(): string | null {
  return process.env.STRIPE_PRICE_CREATIVE_ID?.trim() || null
}

export const ADDON_CATALOG: {
  id: AddonId
  title: string
  usd: number
  priceId: () => string | null
}[] = [
  {
    id: 'store',
    title: 'On-site school store',
    usd: ADDON_STORE_USD,
    priceId: storeAddonPriceId,
  },
  {
    id: 'creative',
    title: 'Done-for-you creative',
    usd: ADDON_CREATIVE_USD,
    priceId: creativeAddonPriceId,
  },
]

export function addonById(id: string) {
  return ADDON_CATALOG.find((a) => a.id === id) || null
}
