import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

/**
 * Board members. fetched live from Wix CMS BoardMembers collection.
 *
 * Board admins can update names, bios, emails, photos, and sort order
 * directly from the Wix dashboard without any code changes.
 *
 * Collection ID: BoardMembers
 * Site: SHMS PTO (509fda24-8dbf-43c6-aa74-df9f8b63c388)
 */

export interface BoardMember {
  id: string
  name: string
  role: string
  email: string
  bio: string
  photo: string | null
  isExec: boolean
  sortOrder: number
}

interface WixDataItem {
  id?: string
  data?: {
    name?: string
    role?: string
    email?: string
    bio?: string
    photo?: string
    isExec?: boolean
    sortOrder?: number
  }
}

interface WixQueryResponse {
  dataItems?: WixDataItem[]
}

export async function getBoardMembers(): Promise<BoardMember[]> {
  const { isDemoInstance } = await import('@/lib/demo/instance')
  const { getActiveBrandPack } = await import('@/lib/crm/active-trial-server')
  const brandPack = await getActiveBrandPack()
  if (brandPack?.board?.length) return brandPack.board.map((m) => ({ ...m }))
  if (isDemoInstance()) {
    const { DEMO_BOARD } = await import('@/lib/demo/content')
    return DEMO_BOARD.map((m) => ({ ...m }))
  }
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID

  if (!apiKey || !siteId) {
 console.warn('[board] Missing WIX_API_KEY or WIX_SITE_ID. returning empty board')
    return []
  }

  try {
    const res = await fetchWithRetry('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'BoardMembers',
        query: {
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 50 },
        },
      }),
      next: { revalidate: 300 }, // refresh every 5 min
    })

    if (!res.ok) {
      console.error('[board] Wix query failed:', res.status, await res.text())
      return []
    }

    const data = (await res.json()) as WixQueryResponse

    return (data.dataItems ?? [])
      .map((item) => ({
      id:        item.id ?? '',
      name:      item.data?.name      ?? 'Open Position',
      role:      item.data?.role      ?? '',
      email:     item.data?.email     ?? '',
      bio:       item.data?.bio       ?? '',
      photo:     item.data?.photo     ?? null,
      isExec:    item.data?.isExec    ?? false,
      sortOrder: item.data?.sortOrder ?? 99,
    }))
      .filter((m) => !isCmsQaItem(m.name, m.role, m.bio, m.email))
  } catch (err) {
    console.error('[board] Fetch error:', err)
    return []
  }
}
