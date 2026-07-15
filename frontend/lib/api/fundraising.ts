/**
 * Fundraising totals — pulled live from Wix eCommerce Orders API.
 *
 * Strategy:
 *  1. Fetch all PAID orders for the current school year (Aug 1 → Jul 31).
 *  2. Walk every line item and match its catalogReference.catalogItemId
 *     against the product-ID sets for each initiative.
 *  3. Sum totals per initiative and return alongside the hardcoded goals.
 *
 * Volunteer hours remain manual — stored in VOLUNTEER_HOURS below.
 */

// ─── School-year window ───────────────────────────────────────────────────────
const SCHOOL_YEAR_START = '2025-08-01T00:00:00.000Z'
const SCHOOL_YEAR_END   = '2026-07-31T23:59:59.999Z'

// ─── Goals & volunteer hours — loaded from Wix SiteSettings CMS at runtime ───
// Fallback values used when CMS is unreachable or keys are missing.
export const VOLUNTEER_HOURS_RAISED_DEFAULT = 320
export const VOLUNTEER_HOURS_GOAL_DEFAULT   = 500

export const GOALS_DEFAULT = {
  membership:  8000,
  store:       6000,
  spiritWear:  3000,
  danceNight:  2500,
  novaMath:    1500,
  other:       1000,
}

// ─── Product ID → initiative mapping ─────────────────────────────────────────
// Add product IDs here as you create them in Wix Stores.
// Store / candy items
const STORE_IDS = new Set([
  '90ae23f7-51f4-438d-869c-1fbb28afd381',
  '96ca63ab-2535-4f91-8ad1-28a5d7d7d7d0',
  'ad137b27-cfa1-45ff-b506-c1021bfad12f',
  'a3e4a887-ad91-42b2-843d-653a11712544',
  '530bfb7e-370e-4174-8e2f-4463b5f34642',
  '53d1d89c-74e3-4f41-9988-5594ce2d590b',
  'fac09820-055c-4202-81ac-545639b8e24f',
  '03be5162-4928-4c39-b707-6e2de07921e0',
  '62b109c8-7b96-4f0d-b09d-fb8d93ff8f9d',
  'fd0bcb5b-6d08-4f0e-bb7c-27bfdc023ae4',
  'd9ed5b01-324d-4136-809d-21a3211b9d89',
  '9e7d4b13-4437-4c51-b63d-4942d18edf64',
])

// Spirit wear items
const SPIRIT_IDS = new Set([
  '82ee7b02-5b3e-4383-8cd8-fcf089b45370',
  '1c0e1c1c-23f8-4095-8e4d-a9c467e6fef8',
  'd0bed142-0410-4442-a8e9-f1a5232862ef',
  'd5730ad6-8d4a-4757-93fa-05aa3ff1e244',
  'e9fbcab5-ae25-418e-a4ac-81889d93acc7',
  'f3eedab0-bfd5-4f30-ad8f-7586b783b78f',
  '791e1007-b926-4416-8a90-24dd641d0887',
])

// Membership products (current + earlier duplicate catalog entries)
const MEMBERSHIP_IDS = new Set<string>([
  '89ad5f10-a4bc-4a31-af4a-22b6add4cad4', // PTO Membership — Ruby
  '58f334f3-32d7-4d38-9639-7e587a38a26f', // PTO Membership — Supreme
  '7dee12b4-ecaf-4070-9682-b01b0a9eaf8d', // Ruby (earlier slug)
  '5f3c7265-7433-4213-b8e0-75a7fab2a06c', // Supreme (earlier slug)
])

// Event tickets — not yet created as Wix store products
const DANCE_NIGHT_IDS = new Set<string>([])

const NOVA_MATH_IDS = new Set<string>([])

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
      // No Next.js cache — this route is called with revalidate at the page level
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

  const [settingsData, orders] = await Promise.all([
    fetchSiteSettingsGoals(),
    fetchAllPaidOrders(),
  ])

  try {
    for (const order of orders) {
      for (const item of order.lineItems ?? []) {
        const productId = item.catalogReference?.catalogItemId ?? ''
        const revenue   = lineItemRevenue(item)

        if (MEMBERSHIP_IDS.has(productId))       totals.membership  += revenue
        else if (STORE_IDS.has(productId))       totals.store       += revenue
        else if (SPIRIT_IDS.has(productId))      totals.spiritWear  += revenue
        else if (DANCE_NIGHT_IDS.has(productId)) totals.danceNight  += revenue
        else if (NOVA_MATH_IDS.has(productId))   totals.novaMath    += revenue
        else                                     totals.other       += revenue
      }
    }
  } catch {
    // return zeros on error — page still renders with empty bars
  }

  return {
    totals,
    goals: settingsData.goals,
    volunteerHoursRaised: settingsData.volunteerHoursRaised,
    volunteerHoursGoal:   settingsData.volunteerHoursGoal,
    fetchedAt: new Date().toISOString(),
  }
}
