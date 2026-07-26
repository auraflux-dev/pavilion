/**
 * Fundraising totals. pulled live from Wix eCommerce Orders API.
 *
 * Strategy:
 *  1. Fetch all PAID orders for the current school year (Aug 1 → Jul 31).
 *  2. Walk every line item and match its catalogReference.catalogItemId
 *     against SiteSettings product-ID lists (storeProductIds / spiritWearProductIds).
 *  3. Sum totals per initiative and return alongside CMS goals.
 *
 * Volunteer hours remain manual. SiteSettings volunteerHoursRaised/Goal.
 */

import { getCatalogConfig } from '@/lib/api/catalog-config'

// ─── School-year window ───────────────────────────────────────────────────────
const SCHOOL_YEAR_START = '2025-08-01T00:00:00.000Z'
const SCHOOL_YEAR_END   = '2026-07-31T23:59:59.999Z'

// ─── Goals & volunteer hours. loaded from Wix SiteSettings CMS at runtime ───
// Fallback values used when CMS is unreachable or keys are missing.
export const VOLUNTEER_HOURS_RAISED_DEFAULT = 0
export const VOLUNTEER_HOURS_GOAL_DEFAULT   = 500

export const GOALS_DEFAULT = {
  membership:  8000,
  store:       6000,
  spiritWear:  3000,
  danceNight:  2500,
  novaMath:    1500,
  other:       1000,
}

// Event tickets. not yet created as Wix store products (can move to SiteSettings later)
const DANCE_NIGHT_IDS = new Set<string>([])
const NOVA_MATH_IDS = new Set<string>([])

/** Older duplicate membership catalog entries still counted toward membership totals */
const LEGACY_MEMBERSHIP_IDS = new Set<string>([
  '7dee12b4-ecaf-4070-9682-b01b0a9eaf8d',
  '5f3c7265-7433-4213-b8e0-75a7fab2a06c',
])

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InitiativeTotals {
  membership: number
  store:      number
  spiritWear: number
  danceNight: number
  novaMath:   number
  other:      number
}

export interface FundraisingData {
  totals:   InitiativeTotals
  goals:    typeof GOALS_DEFAULT
  volunteerHoursRaised: number
  volunteerHoursGoal:   number
  fetchedAt: string
}

// ─── Wix Orders fetch ─────────────────────────────────────────────────────────
interface WixLineItem {
  catalogReference?: { catalogItemId?: string }
  totalPriceBeforeDiscount?: { amount?: string }
  price?: { amount?: string }
  quantity?: number
}

interface WixOrder {
  lineItems?: WixLineItem[]
  priceSummary?: { subtotal?: { amount?: string } }
}

interface WixOrdersResponse {
  orders?: WixOrder[]
  metadata?: { hasNext?: boolean; cursors?: { next?: string } }
}

async function fetchAllPaidOrders(): Promise<WixOrder[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  const all: WixOrder[] = []
  let cursor: string | undefined

  do {
    const body: Record<string, unknown> = {
      search: {
        filter: {
          paymentStatus: 'PAID',
          createdDate: {
            $gte: SCHOOL_YEAR_START,
            $lte: SCHOOL_YEAR_END,
          },
        },
        cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) },
      },
    }

    const res = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify(body),
 // No Next.js cache. this route is called with revalidate at the page level
    })

    if (!res.ok) break

    const data = (await res.json()) as WixOrdersResponse
    if (data.orders) all.push(...data.orders)
    cursor = data.metadata?.hasNext ? data.metadata.cursors?.next : undefined
  } while (cursor)

  return all
}

function lineItemRevenue(item: WixLineItem): number {
  const amt = item.totalPriceBeforeDiscount?.amount ?? item.price?.amount
  if (!amt) return 0
  const n = parseFloat(amt)
  return isNaN(n) ? 0 : n
}

async function fetchSiteSettingsGoals(): Promise<{
  goals: typeof GOALS_DEFAULT
  volunteerHoursRaised: number
  volunteerHoursGoal: number
}> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) {
    return { goals: GOALS_DEFAULT, volunteerHoursRaised: VOLUNTEER_HOURS_RAISED_DEFAULT, volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT }
  }
  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey, 'wix-site-id': siteId },
      body: JSON.stringify({ dataCollectionId: 'SiteSettings', query: { paging: { limit: 100 } } }),
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error('SiteSettings fetch failed')
    const data = await res.json()
    const map: Record<string, string> = {}
    for (const item of data.dataItems ?? []) {
      if (item.data?.key) map[item.data.key] = item.data.value ?? ''
    }
    const n = (k: string, fallback: number) => { const v = parseFloat(map[k]); return isNaN(v) ? fallback : v }
    return {
      goals: {
        membership: n('goalMembership',  GOALS_DEFAULT.membership),
        store:      n('goalStore',       GOALS_DEFAULT.store),
        spiritWear: n('goalSpiritWear',  GOALS_DEFAULT.spiritWear),
        danceNight: n('goalDanceNight',  GOALS_DEFAULT.danceNight),
        novaMath:   n('goalNovaMath',    GOALS_DEFAULT.novaMath),
        other:      GOALS_DEFAULT.other,
      },
      volunteerHoursRaised: n('volunteerHoursRaised', VOLUNTEER_HOURS_RAISED_DEFAULT),
      volunteerHoursGoal:   n('volunteerHoursGoal',   VOLUNTEER_HOURS_GOAL_DEFAULT),
    }
  } catch {
    return { goals: GOALS_DEFAULT, volunteerHoursRaised: VOLUNTEER_HOURS_RAISED_DEFAULT, volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT }
  }
}

export async function getFundraisingTotals(): Promise<FundraisingData> {
  const totals: InitiativeTotals = {
    membership: 0,
    store:      0,
    spiritWear: 0,
    danceNight: 0,
    novaMath:   0,
    other:      0,
  }

  const [settingsData, orders, catalog] = await Promise.all([
    fetchSiteSettingsGoals(),
    fetchAllPaidOrders(),
    getCatalogConfig(),
  ])

  const membershipIds = new Set<string>([
    ...Object.values(catalog.membershipByTier)
      .map((e) => e.productId)
      .filter(Boolean),
    ...Array.from(LEGACY_MEMBERSHIP_IDS),
  ])

  try {
    for (const order of orders) {
      for (const item of order.lineItems ?? []) {
        const productId = item.catalogReference?.catalogItemId ?? ''
        const revenue   = lineItemRevenue(item)

        if (membershipIds.has(productId))            totals.membership  += revenue
        else if (catalog.storeProductIds.has(productId)) totals.store       += revenue
        else if (catalog.spiritWearProductIds.has(productId)) totals.spiritWear  += revenue
        else if (DANCE_NIGHT_IDS.has(productId))     totals.danceNight  += revenue
        else if (NOVA_MATH_IDS.has(productId))       totals.novaMath    += revenue
        else                                         totals.other       += revenue
      }
    }
  } catch {
 // return zeros on error. page still renders with empty bars
  }

  return {
    totals,
    goals: settingsData.goals,
    volunteerHoursRaised: settingsData.volunteerHoursRaised,
    volunteerHoursGoal:   settingsData.volunteerHoursGoal,
    fetchedAt: new Date().toISOString(),
  }
}
