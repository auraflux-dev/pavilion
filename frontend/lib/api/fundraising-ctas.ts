/**
 * Fundraising CTAs — "How Can You Contribute?" cards on /fundraising.
 * Admins manage in: Wix Dashboard → Content Manager → Fundraising CTAs
 */

export interface FundraisingCTA {
  id: string
  title: string
  description: string
  ctaLabel: string
  href: string
  icon: string
  sortOrder: number
  active: boolean
}

interface WixDataItem {
  id?: string
  data?: {
    title?: string
    description?: string
    ctaLabel?: string
    href?: string
    icon?: string
    sortOrder?: number
    active?: boolean
  }
}

const FALLBACK_CTAS: FundraisingCTA[] = [
  { id: 'f1', title: 'Become a Member',    description: 'Join for $50 or $100. The single biggest thing you can do for SHMS students.', ctaLabel: 'Join',      href: '/membership', icon: 'Star',        sortOrder: 1, active: true },
  { id: 'f2', title: 'Load the Store Card',description: "Load $20–$50 on your student's store card — they spend, PTO earns.",           ctaLabel: 'Load Card', href: '/cove',       icon: 'ShoppingBag', sortOrder: 2, active: true },
  { id: 'f3', title: 'Volunteer',          description: 'Give an hour at the store window or help at an event.',                         ctaLabel: 'Sign Up',   href: '/volunteer',  icon: 'Users',       sortOrder: 3, active: true },
  { id: 'f4', title: 'Spread the Word',    description: 'Tell other SHMS families — more members means more programs.',                  ctaLabel: 'Share',     href: '/membership', icon: 'Heart',       sortOrder: 4, active: true },
]

export async function getFundraisingCTAs(): Promise<FundraisingCTA[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return FALLBACK_CTAS

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'FundraisingCTAs',
        query: {
          filter: { active: { $eq: true } },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 20 },
        },
      }),
      next: { revalidate: 300 },
    })

    if (!res.ok) return FALLBACK_CTAS

    const data = await res.json()
    const items = (data.dataItems ?? []).map((item: WixDataItem) => ({
      id:          item.id ?? '',
      title:       item.data?.title       ?? '',
      description: item.data?.description ?? '',
      ctaLabel:    item.data?.ctaLabel    ?? 'Learn More',
      href:        item.data?.href        ?? '/',
      icon:        item.data?.icon        ?? 'Star',
      sortOrder:   item.data?.sortOrder   ?? 99,
      active:      item.data?.active      ?? true,
    }))

    return items.length > 0 ? items : FALLBACK_CTAS
  } catch {
    return FALLBACK_CTAS
  }
}
