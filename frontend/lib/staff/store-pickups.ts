/**
 * Today's Cove store window pickups — paid portal/site snack & spirit lines.
 * Window: Mon–Fri 8:25–8:50 AM America/New_York (soft buffer 8:20–8:55).
 */
import { getWixClient } from '@/lib/wix-client'

export const STORE_WINDOW_TZ = 'America/New_York'
/** Inclusive soft buffer around the posted 8:25–8:50 window. */
export const STORE_WINDOW_START_MIN = 8 * 60 + 20 // 8:20
export const STORE_WINDOW_END_MIN = 8 * 60 + 55 // 8:55

export const PICKUP_STATUS_READY = 'Paid'
export const PICKUP_STATUS_HANDED = 'Paid · handed out'

export type StorePickupItem = {
  id: string
  parentEmail: string
  programName: string
  productLabel: string
  amount: number
  paymentDate: string
  paymentMethod: string
  source: string
  status: string
  handedOut: boolean
  inWindow: boolean
}

function partsInTz(d: Date, timeZone = STORE_WINDOW_TZ) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
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

/** YYYY-MM-DD in Eastern. */
export function etCalendarDate(d = new Date()): string {
  const p = partsInTz(d)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function isWeekdayEt(d = new Date()): boolean {
  const w = partsInTz(d).weekday
  return w !== 'Sat' && w !== 'Sun'
}

export function minutesSinceMidnightEt(d: Date): number {
  const p = partsInTz(d)
  return p.hour * 60 + p.minute
}

export function isInStoreWindow(d: Date): boolean {
  if (!isWeekdayEt(d)) return false
  const m = minutesSinceMidnightEt(d)
  return m >= STORE_WINDOW_START_MIN && m <= STORE_WINDOW_END_MIN
}

export function isCoveProductPayment(row: {
  source?: string
  programName?: string
}): boolean {
  const source = String(row.source ?? '')
  const program = String(row.programName ?? '')
  if (/_cove_product$/i.test(source)) return true
  if (/^The Cove:/i.test(program) && !/Digital Card|Reload|First Load/i.test(program)) {
    return true
  }
  return false
}

export function isHandedOutStatus(status: string): boolean {
  return /handed out/i.test(String(status ?? ''))
}

function productLabel(programName: string): string {
  return String(programName ?? '')
    .replace(/^The Cove:\s*/i, '')
    .trim() || 'Cove item'
}

/** UTC instant for 00:00 America/New_York on today's ET calendar date. */
export function startOfTodayEtUtcSafe(now = new Date()): Date {
  const want = etCalendarDate(now)
  const base = Date.parse(`${want}T00:00:00.000Z`)
  for (let deltaMin = -14 * 60; deltaMin <= 14 * 60; deltaMin++) {
    const t = new Date(base + deltaMin * 60_000)
    const p = partsInTz(t)
    const cal = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
    if (cal === want && p.hour === 0 && p.minute === 0) return t
  }
  // EDT ≈ UTC−4 · EST ≈ UTC−5
  const md = want.slice(5)
  const likelyEdt = md >= '03-08' && md < '11-02'
  return new Date(`${want}T${likelyEdt ? '04' : '05'}:00:00.000Z`)
}

export async function listTodayStorePickups(opts?: {
  includeHandedOut?: boolean
  now?: Date
}): Promise<{
  dateEt: string
  weekday: boolean
  windowLabel: string
  items: StorePickupItem[]
}> {
  const now = opts?.now ?? new Date()
  const includeHandedOut = opts?.includeHandedOut !== false
  const dateEt = etCalendarDate(now)
  const weekday = isWeekdayEt(now)
  const start = startOfTodayEtUtcSafe(now)
  const client = getWixClient()

  let rows: Record<string, unknown>[] = []
  try {
    const result = await client.items
      .query('Payments')
      .ge('paymentDate', start.toISOString())
      .descending('paymentDate')
      .limit(100)
      .find()
    rows = (result.items ?? []) as Record<string, unknown>[]
  } catch {
    const result = await client.items.query('Payments').descending('paymentDate').limit(100).find()
    rows = (result.items ?? []) as Record<string, unknown>[]
  }

  const items: StorePickupItem[] = []
  for (const row of rows) {
    if (!isCoveProductPayment(row as { source?: string; programName?: string })) continue
    const paymentDateRaw = row.paymentDate ? new Date(String(row.paymentDate)) : null
    if (!paymentDateRaw || Number.isNaN(paymentDateRaw.getTime())) continue
    if (etCalendarDate(paymentDateRaw) !== dateEt) continue
    if (!isInStoreWindow(paymentDateRaw)) continue

    const status = String(row.status ?? '')
    const handedOut = isHandedOutStatus(status)
    if (handedOut && !includeHandedOut) continue
    // Skip non-paid / needs reconciliation
    if (!/^paid/i.test(status.trim()) && status.trim() !== '') continue

    const programName = String(row.programName ?? '')
    items.push({
      id: String(row._id ?? ''),
      parentEmail: String(row.parentEmail ?? row.payerEmail ?? '').trim().toLowerCase(),
      programName,
      productLabel: productLabel(programName),
      amount: Number(row.amount ?? 0) || 0,
      paymentDate: paymentDateRaw.toISOString(),
      paymentMethod: String(row.paymentMethod ?? ''),
      source: String(row.source ?? ''),
      status,
      handedOut,
      inWindow: true,
    })
  }

  // Pending first, then handed out; newest first within each
  items.sort((a, b) => {
    if (a.handedOut !== b.handedOut) return a.handedOut ? 1 : -1
    return b.paymentDate.localeCompare(a.paymentDate)
  })

  return {
    dateEt,
    weekday,
    windowLabel: 'M–Fri 8:25–8:50 AM ET (list uses 8:20–8:55 buffer)',
    items,
  }
}

export async function markStorePickupHandedOut(
  paymentId: string,
  action: 'handed_out' | 'undo',
): Promise<StorePickupItem> {
  const id = String(paymentId || '').trim()
  if (!id) throw Object.assign(new Error('Missing payment id'), { status: 400 })

  const client = getWixClient()
  const existing = (await client.items.get('Payments', id)) as Record<string, unknown>
  if (!existing?._id) throw Object.assign(new Error('Payment not found'), { status: 404 })
  if (!isCoveProductPayment(existing as { source?: string; programName?: string })) {
    throw Object.assign(new Error('Not a Cove store product payment'), { status: 400 })
  }

  const nextStatus = action === 'handed_out' ? PICKUP_STATUS_HANDED : PICKUP_STATUS_READY
  const noteTag = 'Store window pickup'
  const prevNotes = String(existing.notes ?? '')
  const notes =
    action === 'handed_out'
      ? prevNotes.includes(noteTag)
        ? prevNotes
        : [prevNotes, `${noteTag} · handed out ${new Date().toISOString()}`]
            .filter(Boolean)
            .join(' · ')
      : prevNotes.replace(/\s*·?\s*Store window pickup · handed out[^·]*/gi, '').trim()

  await client.items.update('Payments', {
    ...existing,
    _id: id,
    status: nextStatus,
    notes,
  } as Parameters<typeof client.items.update>[1])

  const programName = String(existing.programName ?? '')
  const paymentDate = existing.paymentDate
    ? new Date(String(existing.paymentDate)).toISOString()
    : new Date().toISOString()

  return {
    id,
    parentEmail: String(existing.parentEmail ?? '').trim().toLowerCase(),
    programName,
    productLabel: productLabel(programName),
    amount: Number(existing.amount ?? 0) || 0,
    paymentDate,
    paymentMethod: String(existing.paymentMethod ?? ''),
    source: String(existing.source ?? ''),
    status: nextStatus,
    handedOut: action === 'handed_out',
    inWindow: isInStoreWindow(new Date(paymentDate)),
  }
}
