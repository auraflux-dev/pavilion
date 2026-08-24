/**
 * ET date windows for Staff → Payments and Refunds list filters.
 */
import { etCalendarDate, STORE_WINDOW_TZ } from '@/lib/staff/store-pickups'

export type PaymentsListRange = 'today' | 'week' | 'month' | 'custom' | 'all'

const WEEKDAYS_ET = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function partsInTz(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_WINDOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday || '',
    hour: Number(map.hour),
    minute: Number(map.minute),
  }
}

/** UTC instant for 00:00 America/New_York on YYYY-MM-DD. */
export function startOfEtDateUtc(ymd: string): Date {
  const base = Date.parse(`${ymd}T00:00:00.000Z`)
  for (let deltaMin = -14 * 60; deltaMin <= 14 * 60; deltaMin++) {
    const t = new Date(base + deltaMin * 60_000)
    const p = partsInTz(t)
    const cal = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
    if (cal === ymd && p.hour === 0 && p.minute === 0) return t
  }
  const md = ymd.slice(5)
  const likelyEdt = md >= '03-08' && md < '11-02'
  return new Date(`${ymd}T${likelyEdt ? '04' : '05'}:00:00.000Z`)
}

/** Exclusive end: start of the ET day after ymd. */
export function endExclusiveOfEtDateUtc(ymd: string): Date {
  const next = addDaysYmd(ymd, 1)
  return startOfEtDateUtc(next)
}

function addDaysYmd(ymd: string, days: number): string {
  const start = startOfEtDateUtc(ymd)
  const t = new Date(start.getTime() + days * 24 * 3600_000 + 12 * 3600_000)
  return etCalendarDate(t)
}

/** Sunday–Saturday week containing `now` in ET. */
export function weekBoundsEt(now = new Date()): { fromYmd: string; toYmd: string } {
  const today = etCalendarDate(now)
  const weekday = partsInTz(now).weekday
  const idx = WEEKDAYS_ET.indexOf(weekday as (typeof WEEKDAYS_ET)[number])
  const sunOffset = idx >= 0 ? idx : 0
  const fromYmd = addDaysYmd(today, -sunOffset)
  const toYmd = addDaysYmd(fromYmd, 6)
  return { fromYmd, toYmd }
}

export function monthBoundsEt(now = new Date()): { fromYmd: string; toYmd: string } {
  const p = partsInTz(now)
  const fromYmd = `${p.year}-${String(p.month).padStart(2, '0')}-01`
  const nextMonth = p.month === 12 ? 1 : p.month + 1
  const nextYear = p.month === 12 ? p.year + 1 : p.year
  const nextFirst = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  const toYmd = addDaysYmd(nextFirst, -1)
  return { fromYmd, toYmd }
}

export function resolvePaymentsListBounds(opts: {
  range: PaymentsListRange
  from?: string | null
  to?: string | null
  now?: Date
}): { ge: Date; lt: Date; fromYmd: string; toYmd: string } | null {
  const now = opts.now ?? new Date()
  if (opts.range === 'all') return null

  let fromYmd = ''
  let toYmd = ''

  if (opts.range === 'today') {
    fromYmd = etCalendarDate(now)
    toYmd = fromYmd
  } else if (opts.range === 'week') {
    const b = weekBoundsEt(now)
    fromYmd = b.fromYmd
    toYmd = b.toYmd
  } else if (opts.range === 'month') {
    const b = monthBoundsEt(now)
    fromYmd = b.fromYmd
    toYmd = b.toYmd
  } else if (opts.range === 'custom') {
    fromYmd = String(opts.from ?? '').trim()
    toYmd = String(opts.to ?? '').trim() || fromYmd
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) {
      throw new Error('Custom range needs from=YYYY-MM-DD')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toYmd)) {
      throw new Error('Custom range needs to=YYYY-MM-DD')
    }
    if (toYmd < fromYmd) {
      const swap = fromYmd
      fromYmd = toYmd
      toYmd = swap
    }
  } else {
    const b = weekBoundsEt(now)
    fromYmd = b.fromYmd
    toYmd = b.toYmd
  }

  return {
    ge: startOfEtDateUtc(fromYmd),
    lt: endExclusiveOfEtDateUtc(toYmd),
    fromYmd,
    toYmd,
  }
}

export function parsePaymentsListRange(raw: string | null, onlyNeeds: boolean): PaymentsListRange {
  if (onlyNeeds) return 'all'
  const v = String(raw ?? 'week').trim().toLowerCase()
  if (v === 'today' || v === 'week' || v === 'month' || v === 'custom' || v === 'all') return v
  return 'week'
}
