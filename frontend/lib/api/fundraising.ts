/**
 * Fundraising totals for the current school year (Aug 1 → Jul 31).
 *
 * Cove Digital Card bar = family paid to load the card (not window spend).
 * Cove shop = spirit wear and snacks sold any other way (Stand, cash, Zelle, site).
 * Square / PayPal site checkout and Stand POS → Payments.
 * Bank of America CSV (Staff → Budget import) → PtoBudgetEntries.
 * Live PayPal Transaction Search (Refresh) → PtoBudgetEntries, skipping payouts to bank.
 * Only Aug 1 to Jul 31 of the current school year. Square/PayPal *payouts* in the
 * bank file are skipped so those sales are not counted twice.
 *
 * Volunteer hours remain manual. SiteSettings volunteerHoursRaised/Goal.
 */

import { getWixClient } from '@/lib/wix-client'
import { isDemoInstance } from '@/lib/demo/instance'
import { listBudgetLines, money } from '@/lib/staff/budget'
import { listBudgetEntries } from '@/lib/staff/budget-sync'
import { DEFAULT_FISCAL_YEAR } from '@/lib/staff/budget'

/** Year-end reserve on top of projected operating expenses (excludes contingency line). */
export const FUNDRAISING_GOAL_LIFT = 0.1

export interface FundraisingAnnualGoal {
  goal: number
  expenseBudgeted: number
  liftPercent: number
}

export const VOLUNTEER_HOURS_RAISED_DEFAULT = 0
export const VOLUNTEER_HOURS_GOAL_DEFAULT = 500

export const GOALS_DEFAULT = {
  membership: 8000,
  store: 6000,
  spiritWear: 3000,
  danceNight: 2500,
  novaMath: 1500,
  other: 1000,
}

export interface InitiativeTotals {
  membership: number
  store: number
  spiritWear: number
  danceNight: number
  novaMath: number
  other: number
}

export interface FundraisingData {
  totals: InitiativeTotals
  goals: typeof GOALS_DEFAULT
  volunteerHoursRaised: number
  volunteerHoursGoal: number
  sponsorshipFromBank: number
  fetchedAt: string
}

/** Aug 1 to Jul 31 in UTC, rolling with the calendar. */
export function schoolYearWindow(now = new Date()) {
  const year = now.getUTCFullYear()
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1
  const from = new Date(Date.UTC(startYear, 7, 1, 0, 0, 0, 0))
  const to = new Date(Date.UTC(startYear + 1, 6, 31, 23, 59, 59, 999))
  return { from, to, fromMs: from.getTime(), toMs: to.getTime() }
}

function inWindow(iso: string, fromMs: number, toMs: number) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= fromMs && t <= toMs
}

function mapBankSyncKey(key: string): keyof InitiativeTotals | null {
  if (key === 'memberships') return 'membership'
  if (key === 'cove_loads') return 'store'
  if (key === 'cove_shop') return 'spiritWear'
  if (key === 'dance_night') return 'danceNight'
  if (key === 'nova_math') return 'novaMath'
  if (
    key === 'events_other' ||
    key === 'enrichment_fees' ||
    key === 'gifts' ||
    key === 'run_for_charity' ||
    key === 'unclassified_income'
  ) {
    return 'other'
  }
  return null
}

/**
 * Public tracker split:
 * - Cove Digital Card = family paid to load the card (cash in). Window spend is not new money.
 * - Cove shop = spirit wear or snack/candy sold with Square, cash, Zelle, or the site.
 */
function classifyFundraisingPayment(
  source: string,
  programName: string,
  status: string,
  paymentMethod: string,
): keyof InitiativeTotals | null {
  const src = source.toLowerCase()
  const name = programName.toLowerCase()
  const st = status.toLowerCase()
  const method = paymentMethod.toLowerCase()
  if (src.includes('load_failed') || st.includes('fail') || st.includes('reconcil')) return null
  if (src === 'membership_gift_card') return null
  if (src.includes('register_redeem') || method.includes('cove family')) return null
  if (src.includes('store_card') || src.includes('auto_topoff')) return 'store'

  if (src.includes('membership')) return 'membership'
  if (
    src.includes('cove_product') ||
    src.includes('pos_stand') ||
    src.includes('register_stand') ||
    src.includes('terminal') ||
    src.includes('register_cash') ||
    src.includes('register_zelle') ||
    src.includes('register_paypal') ||
    src.includes('register_phone') ||
    src.includes('register_other')
  ) {
    return 'spiritWear'
  }
  if (src.includes('event_ticket') || name.includes('ticket')) {
    if (name.includes('dance')) return 'danceNight'
    if (name.includes('nova')) return 'novaMath'
    return 'other'
  }
  if (src.includes('_program') || src.endsWith('program') || src.includes('enrichment')) {
    if (name.includes('nova')) return 'novaMath'
    if (name.includes('dance')) return 'danceNight'
    return 'other'
  }
  if (src.includes('donation') || src.includes('cheddarup') || name.includes('donation')) return 'other'
  if (name.includes('membership')) return 'membership'
  if (
    name.includes('spirit') ||
    name.includes('shop') ||
    name.includes('vintage') ||
    name.includes('hoodie') ||
    name.includes('candy') ||
    name.includes('snack') ||
    name.includes('in-person')
  ) {
    return 'spiritWear'
  }
  return null
}

function schoolYearFiscalKey(now = new Date()) {
  const year = now.getUTCFullYear()
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

/** Public hero goal: projected operating expenses + 10% year-end reserve (Staff → Budget). */
export async function getFundraisingAnnualGoal(): Promise<FundraisingAnnualGoal> {
  const liftPercent = Math.round(FUNDRAISING_GOAL_LIFT * 100)

  if (isDemoInstance()) {
    const expenseBudgeted = 18000
    return {
      expenseBudgeted,
      liftPercent,
      goal: money(expenseBudgeted * (1 + FUNDRAISING_GOAL_LIFT)),
    }
  }

  const fiscalYear = schoolYearFiscalKey()
  const lines = await listBudgetLines(fiscalYear).catch(() => [])
  const expenseBudgeted = money(
    lines
      .filter((l) => l.kind === 'expense' && l.syncKey !== 'contingency')
      .reduce((n, l) => n + l.budgeted, 0),
  )

  return {
    expenseBudgeted,
    liftPercent,
    goal: money(expenseBudgeted * (1 + FUNDRAISING_GOAL_LIFT)),
  }
}

const BANK_CSV_ORIGINS = new Set(['auto-bofa', 'auto-plaid', 'auto-paypal'])

async function fetchAllPayments(): Promise<Record<string, unknown>[]> {
  try {
    const client = getWixClient()
    const rows: Record<string, unknown>[] = []
    const pageSize = 100
    const max = 1500
    for (let skip = 0; skip < max; skip += pageSize) {
      const res = await client.items
        .query('Payments')
        .skip(skip)
        .limit(pageSize)
        .find()
        .catch(() => ({ items: [] }))
      const items = (res.items ?? []) as Record<string, unknown>[]
      rows.push(...items)
      if (items.length < pageSize) break
    }
    return rows
  } catch {
    return []
  }
}

async function fetchSiteSettingsGoals(): Promise<{
  goals: typeof GOALS_DEFAULT
  volunteerHoursRaised: number
  volunteerHoursGoal: number
}> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) {
    return {
      goals: GOALS_DEFAULT,
      volunteerHoursRaised: VOLUNTEER_HOURS_RAISED_DEFAULT,
      volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT,
    }
  }
  try {
    const { fetchWithRetry } = await import('@/lib/fetch-with-retry')
    const res = await fetchWithRetry('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey, 'wix-site-id': siteId },
      body: JSON.stringify({ dataCollectionId: 'SiteSettings', query: { paging: { limit: 100 } } }),
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('SiteSettings fetch failed')
    const data = await res.json()
    const map: Record<string, string> = {}
    for (const item of data.dataItems ?? []) {
      if (item.data?.key) map[item.data.key] = item.data.value ?? ''
    }
    const n = (k: string, fallback: number) => {
      const v = parseFloat(map[k])
      return isNaN(v) ? fallback : v
    }
    return {
      goals: {
        membership: n('goalMembership', GOALS_DEFAULT.membership),
        store: n('goalStore', GOALS_DEFAULT.store),
        spiritWear: n('goalSpiritWear', GOALS_DEFAULT.spiritWear),
        danceNight: n('goalDanceNight', GOALS_DEFAULT.danceNight),
        novaMath: n('goalNovaMath', GOALS_DEFAULT.novaMath),
        other: GOALS_DEFAULT.other,
      },
      volunteerHoursRaised: n('volunteerHoursRaised', VOLUNTEER_HOURS_RAISED_DEFAULT),
      volunteerHoursGoal: n('volunteerHoursGoal', VOLUNTEER_HOURS_GOAL_DEFAULT),
    }
  } catch {
    return {
      goals: GOALS_DEFAULT,
      volunteerHoursRaised: VOLUNTEER_HOURS_RAISED_DEFAULT,
      volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT,
    }
  }
}

async function demoFundraisingFetchedAt(): Promise<string> {
  try {
    const { commonsDbEnabled } = await import('@/lib/crm/db')
    if (!commonsDbEnabled()) return ''
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    const { riversideSnapshot } = await import('@/lib/crm/riverside')
    const { getOrgSyncState } = await import('@/lib/crm/sync-state')
    await ensureCommonsReady()
    const state = await getOrgSyncState(riversideSnapshot().organization.id)
    return state?.squareLastOkAt || state?.plaidLastOkAt || ''
  } catch {
    return ''
  }
}

export async function getFundraisingTotals(): Promise<FundraisingData> {
  if (isDemoInstance()) {
    return {
      totals: {
        membership: 6400,
        store: 3180,
        spiritWear: 1420,
        danceNight: 980,
        novaMath: 640,
        other: 380,
      },
      goals: GOALS_DEFAULT,
      volunteerHoursRaised: 210,
      volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT,
      sponsorshipFromBank: 0,
      fetchedAt: await demoFundraisingFetchedAt(),
    }
  }

  const totals: InitiativeTotals = {
    membership: 0,
    store: 0,
    spiritWear: 0,
    danceNight: 0,
    novaMath: 0,
    other: 0,
  }

  const { fromMs, toMs } = schoolYearWindow()
  const fy = `${new Date(fromMs).getUTCFullYear()}-${String(new Date(fromMs).getUTCFullYear() + 1).slice(-2)}`
  const [settingsData, payments, bankEntries] = await Promise.all([
    fetchSiteSettingsGoals(),
    fetchAllPayments(),
    listBudgetEntries(fy || DEFAULT_FISCAL_YEAR).catch(() => []),
  ])

  for (const raw of payments) {
    const bucket = classifyFundraisingPayment(
      String(raw.source ?? ''),
      String(raw.programName ?? ''),
      String(raw.status ?? ''),
      String(raw.paymentMethod ?? ''),
    )
    if (!bucket) continue
    const when = String(raw.paymentDate ?? raw._createdDate ?? '')
    if (!inWindow(when, fromMs, toMs)) continue
    const amount = Number(raw.amount ?? 0)
    if (!(amount > 0)) continue
    totals[bucket] += amount
  }

  let sponsorshipFromBank = 0
  for (const entry of bankEntries) {
    if (!BANK_CSV_ORIGINS.has(entry.origin)) continue
    if (!inWindow(`${entry.occurredAt}T12:00:00.000Z`, fromMs, toMs)) continue
    if (!(entry.amount > 0)) continue
    if (entry.lineSyncKey === 'sponsorships') {
      sponsorshipFromBank += entry.amount
      continue
    }
    const bucket = mapBankSyncKey(entry.lineSyncKey)
    if (!bucket) continue
    totals[bucket] += entry.amount
  }

  return {
    totals,
    goals: settingsData.goals,
    volunteerHoursRaised: settingsData.volunteerHoursRaised,
    volunteerHoursGoal: settingsData.volunteerHoursGoal,
    sponsorshipFromBank,
    fetchedAt: new Date().toISOString(),
  }
}
