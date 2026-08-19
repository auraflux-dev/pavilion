/**
 * Fundraising totals for the current school year (Aug 1 → Jul 31).
 *
 * Sales go through Square (and PayPal) and land in the Payments CMS collection.
 * This page used to search Wix eCom orders in a hardcoded 2025–26 window, so
 * after Jul 31 2026 every bar stayed at $0. We now sum the same Staff Payments
 * ledger the treasurer budget uses.
 *
 * Volunteer hours remain manual. SiteSettings volunteerHoursRaised/Goal.
 */

import { getWixClient } from '@/lib/wix-client'
import { isDemoInstance } from '@/lib/demo/instance'
import { classifyPayment } from '@/lib/staff/budget-sync'

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
  fetchedAt: string
}

/** Aug 1 – Jul 31 in UTC, rolling with the calendar. */
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

function mapSyncKey(key: string): keyof InitiativeTotals | null {
  if (key === 'memberships') return 'membership'
  if (key === 'cove_loads' || key === 'cove_pos') return 'store'
  if (key === 'cove_shop') return 'spiritWear'
  if (key === 'dance_night') return 'danceNight'
  if (key === 'nova_math') return 'novaMath'
  if (
    key === 'events_other' ||
    key === 'enrichment_fees' ||
    key === 'gifts'
  ) {
    return 'other'
  }
  return null
}

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
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
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

export async function getFundraisingTotals(): Promise<FundraisingData> {
  if (isDemoInstance()) {
    return {
      totals: {
        membership: 12480,
        store: 4860,
        spiritWear: 1920,
        danceNight: 1640,
        novaMath: 720,
        other: 410,
      },
      goals: GOALS_DEFAULT,
      volunteerHoursRaised: 210,
      volunteerHoursGoal: VOLUNTEER_HOURS_GOAL_DEFAULT,
      fetchedAt: new Date().toISOString(),
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
  const [settingsData, payments] = await Promise.all([fetchSiteSettingsGoals(), fetchAllPayments()])

  for (const raw of payments) {
    const key = classifyPayment(
      String(raw.source ?? ''),
      String(raw.programName ?? ''),
      String(raw.status ?? ''),
    )
    if (!key) continue
    const bucket = mapSyncKey(key)
    if (!bucket) continue
    const when = String(raw.paymentDate ?? raw._createdDate ?? '')
    if (!inWindow(when, fromMs, toMs)) continue
    const amount = Number(raw.amount ?? 0)
    if (!(amount > 0)) continue
    totals[bucket] += amount
  }

  return {
    totals,
    goals: settingsData.goals,
    volunteerHoursRaised: settingsData.volunteerHoursRaised,
    volunteerHoursGoal: settingsData.volunteerHoursGoal,
    fetchedAt: new Date().toISOString(),
  }
}
