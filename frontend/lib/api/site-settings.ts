/**
 * Site Settings — key/value pairs managed in Wix CMS.
 *
 * Admins update values in: Wix Dashboard → Content Manager → Site Settings
 * Changes are live within about a minute (revalidate = 60).
 *
 * Usage:
 *   const settings = await getSiteSettings()
 *   settings.get('storeHours')          // → 'Mon–Fri · 8:15 AM – 9:00 AM'
 *   settings.getNumber('goalStore')     // → 6000
 *   settings.getBool('announcementEnabled') // → true
 */

interface SiteSettingsMap {
  get(key: string, fallback?: string): string
  getNumber(key: string, fallback?: number): number
  getBool(key: string, fallback?: boolean): boolean
  raw: Record<string, string>
}

interface WixDataItem {
  data?: { key?: string; value?: string }
}

async function fetchAllSettings(): Promise<Record<string, string>> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return {}

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'SiteSettings',
        query: { paging: { limit: 200 } },
      }),
      // Always fresh — board edits membershipSharedBenefits / nav often
      cache: 'no-store',
    })

    if (!res.ok) return {}

    const data = await res.json()
    const map: Record<string, string> = {}
    for (const item of (data.dataItems ?? []) as WixDataItem[]) {
      if (item.data?.key) map[item.data.key] = item.data.value ?? ''
    }
    return map
  } catch {
    return {}
  }
}

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const raw = await fetchAllSettings()

  return {
    raw,
    get(key: string, fallback = ''): string {
      return raw[key] ?? fallback
    },
    getNumber(key: string, fallback = 0): number {
      const v = raw[key]
      if (v === undefined) return fallback
      const n = parseFloat(v)
      return isNaN(n) ? fallback : n
    },
    getBool(key: string, fallback = true): boolean {
      const v = raw[key]
      if (v === undefined) return fallback
      return v.toLowerCase() !== 'false'
    },
  }
}
