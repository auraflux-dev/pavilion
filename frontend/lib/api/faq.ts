/**
 * FAQ items — fetched from Wix CMS FAQItems collection.
 * Admins manage in: Wix Dashboard → Content Manager → FAQ Items
 *
 * Filter by `page` field to show the right FAQs on each page:
 *   'membership' | 'volunteer' | 'general'
 */

export interface FAQItem {
  id: string
  question: string
  answer: string
  page: string
  sortOrder: number
  active: boolean
}

interface WixDataItem {
  id?: string
  data?: {
    question?: string
    answer?: string
    page?: string
    sortOrder?: number
    active?: boolean
  }
}

export async function getFAQItems(page?: string): Promise<FAQItem[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  try {
    const filter: Record<string, unknown> = { active: { $eq: true } }
    if (page) filter.page = { $eq: page }

    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'FAQItems',
        query: {
          filter,
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 50 },
        },
      }),
      next: { revalidate: 300 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return (data.dataItems ?? []).map((item: WixDataItem) => ({
      id:        item.id ?? '',
      question:  item.data?.question  ?? '',
      answer:    item.data?.answer    ?? '',
      page:      item.data?.page      ?? 'general',
      sortOrder: item.data?.sortOrder ?? 99,
      active:    item.data?.active    ?? true,
    }))
  } catch {
    return []
  }
}
