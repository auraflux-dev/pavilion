/**
 * Membership tiers — fetched from Wix CMS MembershipTiers collection.
 * Admins manage in: Wix Dashboard → Content Manager → Membership Tiers
 *
 * Perks are stored as newline-separated text and split into arrays here.
 * giftCardCredit = Square store-card dollars loaded when this tier is purchased.
 * productId / variantId = optional Wix Catalog IDs for checkout (Site Settings used as fallback).
 */

export interface MembershipTier {
  id: string
  tierId: string // 'ruby' | 'supreme' | 'pearl' | 'faculty' | any future paid slug
  name: string
  price: number
  description: string
  perks: string[]
  popular: boolean
  sortOrder: number
  active: boolean
  /** Dollars loaded onto the student's Square gift card at purchase (0 = no load). */
  giftCardCredit: number
  /** Optional Wix Catalog product UUID for this tier's checkout. */
  productId: string
  /** Optional Wix Catalog variant UUID. */
  variantId: string
}

interface WixDataItem {
  id?: string
  data?: {
    tierId?: string
    name?: string
    price?: number
    description?: string
    perks?: string
    popular?: boolean
    highlighted?: boolean
    sortOrder?: number
    active?: boolean
    giftCardCredit?: number
    productId?: string
    variantId?: string
  }
}

export async function getMembershipTiers(): Promise<MembershipTier[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'MembershipTiers',
        query: {
          filter: { active: { $eq: true } },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 20 },
        },
      }),
      next: { revalidate: 60 },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.dataItems ?? []).map((item: WixDataItem) => ({
      id: item.id ?? '',
      tierId: item.data?.tierId ?? '',
      name: item.data?.name ?? '',
      price: item.data?.price ?? 0,
      description: item.data?.description ?? '',
      perks: (item.data?.perks ?? '')
        .split('\n')
        .map((p: string) => p.trim())
        .filter(Boolean),
      popular: item.data?.popular ?? item.data?.highlighted ?? false,
      sortOrder: item.data?.sortOrder ?? 99,
      active: item.data?.active ?? true,
      giftCardCredit: Number(item.data?.giftCardCredit ?? 0) || 0,
      productId: String(item.data?.productId ?? '').trim(),
      variantId: String(item.data?.variantId ?? '').trim(),
    }))
  } catch {
    return []
  }
}

/** Paid (purchasable) tiers only — excludes faculty / blank. */
export async function getPaidMembershipTiers(): Promise<MembershipTier[]> {
  const tiers = await getMembershipTiers()
  return tiers.filter((t) => t.tierId && t.tierId !== 'faculty' && t.tierId !== 'free')
}

export async function getMembershipTierById(
  tierId: string
): Promise<MembershipTier | null> {
  const id = tierId.trim().toLowerCase()
  if (!id) return null
  const tiers = await getMembershipTiers()
  return tiers.find((t) => t.tierId.toLowerCase() === id) ?? null
}
