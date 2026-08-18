/**
 * Public sponsors list from Wix CMS Sponsors collection.
 */
import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { getWixClient } from '@/lib/wix-client'

export type Sponsor = {
  id: string
  name: string
  blurb: string
  logoUrl: string
  websiteUrl: string
  tier: string
  sortOrder: number
}

export async function getActiveSponsors(): Promise<Sponsor[]> {
  const { isDemoInstance } = await import('@/lib/demo/instance')
  if (isDemoInstance()) return []
  try {
    const client = getWixClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = client.items.query('Sponsors')
    try {
      query = query.eq('active', true)
    } catch {
      // active field optional
    }
    try {
      query = query.ascending('sortOrder')
    } catch {
      // sort optional
    }
    const result = await query.limit(50).find()
    return (result.items ?? [])
      .map((row: Record<string, unknown>) => ({
        id: String(row._id ?? ''),
        name: String(row.name ?? '').trim(),
        blurb: String(row.blurb ?? row.description ?? '').trim(),
        logoUrl: String(row.logoUrl ?? row.logo ?? '').trim(),
        websiteUrl: String(row.websiteUrl ?? row.url ?? '').trim(),
        tier: String(row.tier ?? 'Community').trim() || 'Community',
        sortOrder: Number(row.sortOrder ?? 0) || 0,
      }))
      .filter((s: Sponsor) => s.name && !isCmsQaItem(s.name, s.blurb))
      .sort((a: Sponsor, b: Sponsor) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  } catch {
    return []
  }
}
