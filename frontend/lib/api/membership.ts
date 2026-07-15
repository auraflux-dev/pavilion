/**
 * Membership tiers — fetched from Wix CMS MembershipTiers collection.
 * Admins manage in: Wix Dashboard → Content Manager → Membership Tiers
 *
 * Perks are stored as newline-separated text and split into arrays here.
 */

export interface MembershipTier {
  id: string
  tierId: string       // 'ruby' | 'supreme' | 'faculty'
  name: string
  price: number
  description: string
  perks: string[]
  popular: boolean
  sortOrder: number
  active: boolean
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
    sortOrder?: number
    active?: boolean
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
      next: { revalidate: 300 },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.dataItems ?? []).map((item: WixDataItem) => ({
      id:          item.id ?? '',
      tierId:      item.data?.tierId      ?? '',
      name:        item.data?.name        ?? '',
      price:       item.data?.price       ?? 0,
      description: item.data?.description ?? '',
      perks:       (item.data?.perks ?? '').split('\n').map((p: string) => p.trim()).filter(Boolean),
      popular:     item.data?.popular     ?? false,
      sortOrder:   item.data?.sortOrder   ?? 99,
      active:      item.data?.active      ?? true,
    }))
  } catch {
    return []
  }
}
