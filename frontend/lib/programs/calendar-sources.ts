/**
 * Staff EP planning calendar sources (LCPS ICS, other school calendars).
 * Overlay only. EP meeting nights stay on Programs.meetingDates.
 */

import { fetchIcsText, parseIcsEvents, type IcsCalendarEvent } from '@/lib/programs/ics'

export const STAFF_CALENDAR_SOURCES_COLLECTION = 'StaffCalendarSources'

export type StaffCalendarSourceTone = 'slate' | 'amber' | 'blue' | 'rose'

export type StaffCalendarSource = {
  id: string
  name: string
  kind: 'ics_url' | 'ics_paste'
  sourceUrl: string
  tone: StaffCalendarSourceTone
  active: boolean
  refreshedAt: string
  lastError: string
  events: IcsCalendarEvent[]
  createdByEmail: string
  updatedAt: string
}

export type StaffCalendarSourceRow = {
  _id?: string
  name?: string
  kind?: string
  sourceUrl?: string
  tone?: string
  active?: boolean
  refreshedAt?: string | Date
  lastError?: string
  cachedEventsJson?: string
  createdByEmail?: string
  updatedAt?: string | Date
}

const TONES: StaffCalendarSourceTone[] = ['slate', 'amber', 'blue', 'rose']

export function normalizeTone(raw: unknown): StaffCalendarSourceTone {
  const t = String(raw ?? '').trim().toLowerCase()
  return (TONES.includes(t as StaffCalendarSourceTone) ? t : 'slate') as StaffCalendarSourceTone
}

export function parseCachedEvents(raw: unknown): IcsCalendarEvent[] {
  if (Array.isArray(raw)) {
    return raw
      .map((e) => ({
        date: String((e as IcsCalendarEvent)?.date ?? '').slice(0, 10),
        title: String((e as IcsCalendarEvent)?.title ?? '').trim(),
        endDate: (e as IcsCalendarEvent)?.endDate
          ? String((e as IcsCalendarEvent).endDate).slice(0, 10)
          : undefined,
      }))
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title)
  }
  const text = String(raw ?? '').trim()
  if (!text) return []
  try {
    return parseCachedEvents(JSON.parse(text))
  } catch {
    return []
  }
}

function toIso(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && '$date' in (value as object)) {
    return String((value as { $date: string }).$date)
  }
  try {
    return new Date(String(value)).toISOString()
  } catch {
    return ''
  }
}

export function mapStaffCalendarSource(row: StaffCalendarSourceRow): StaffCalendarSource {
  return {
    id: row._id ?? '',
    name: String(row.name ?? '').trim() || 'Calendar',
    kind: String(row.kind ?? '').trim() === 'ics_paste' ? 'ics_paste' : 'ics_url',
    sourceUrl: String(row.sourceUrl ?? '').trim(),
    tone: normalizeTone(row.tone),
    active: row.active !== false,
    refreshedAt: toIso(row.refreshedAt),
    lastError: String(row.lastError ?? ''),
    events: parseCachedEvents(row.cachedEventsJson),
    createdByEmail: String(row.createdByEmail ?? '').toLowerCase(),
    updatedAt: toIso(row.updatedAt),
  }
}

/** Cap cached events so CMS TEXT stays manageable (school-year planning window). */
export function filterEventsForCache(
  events: IcsCalendarEvent[],
  opts?: { from?: string; to?: string },
): IcsCalendarEvent[] {
  const from = opts?.from ?? '2026-08-01'
  const to = opts?.to ?? '2027-06-30'
  return events.filter((e) => e.date >= from && e.date <= to).slice(0, 800)
}

export function serializeCachedEvents(events: IcsCalendarEvent[]): string {
  return JSON.stringify(filterEventsForCache(events))
}

export async function refreshEventsFromSource(input: {
  kind: 'ics_url' | 'ics_paste'
  sourceUrl?: string
  icsText?: string
}): Promise<{ events: IcsCalendarEvent[]; error: string }> {
  try {
    let text = String(input.icsText ?? '')
    if (input.kind === 'ics_url') {
      text = await fetchIcsText(String(input.sourceUrl ?? ''))
    }
    if (!text.trim()) return { events: [], error: 'No calendar data to parse' }
    const events = filterEventsForCache(parseIcsEvents(text))
    if (!events.length) return { events: [], error: 'No events found in that calendar' }
    return { events, error: '' }
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : 'Refresh failed' }
  }
}

export function holidayTitlesOnDate(
  sources: StaffCalendarSource[],
  isoDate: string,
): string[] {
  const day = String(isoDate ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return []
  const titles: string[] = []
  for (const src of sources) {
    if (!src.active) continue
    for (const ev of src.events) {
      if (ev.date === day) titles.push(`${src.name}: ${ev.title}`)
    }
  }
  return titles
}

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

const SOURCE_FIELDS = [
  { key: 'name', displayName: 'Name', type: 'TEXT' },
  { key: 'kind', displayName: 'Kind (ics_url | ics_paste)', type: 'TEXT' },
  { key: 'sourceUrl', displayName: 'ICS / webcal URL', type: 'TEXT' },
  { key: 'tone', displayName: 'Chip tone', type: 'TEXT' },
  { key: 'active', displayName: 'Active', type: 'BOOLEAN' },
  { key: 'refreshedAt', displayName: 'Refreshed at', type: 'TEXT' },
  { key: 'lastError', displayName: 'Last error', type: 'TEXT' },
  { key: 'cachedEventsJson', displayName: 'Cached events JSON', type: 'TEXT' },
  { key: 'createdByEmail', displayName: 'Created by email', type: 'TEXT' },
  { key: 'updatedAt', displayName: 'Updated at', type: 'TEXT' },
]

async function ensureSourceFields(headers: Record<string, string>): Promise<void> {
  const getRes = await fetch(
    `https://www.wixapis.com/wix-data/v2/collections/${STAFF_CALENDAR_SOURCES_COLLECTION}`,
    { method: 'GET', headers },
  )
  if (!getRes.ok) return
  const getBody = (await getRes.json().catch(() => ({}))) as {
    collection?: { fields?: { key?: string }[] }
  }
  const existing = new Set((getBody.collection?.fields ?? []).map((f) => String(f.key ?? '')))
  for (const field of SOURCE_FIELDS) {
    if (existing.has(field.key)) continue
    await fetch('https://www.wixapis.com/wix-data/v2/collections/create-field', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataCollectionId: STAFF_CALENDAR_SOURCES_COLLECTION,
        field,
      }),
    })
  }
}

export async function ensureStaffCalendarSourcesCollection(): Promise<void> {
  const headers = wixHeaders()
  const getRes = await fetch(
    `https://www.wixapis.com/wix-data/v2/collections/${STAFF_CALENDAR_SOURCES_COLLECTION}`,
    { method: 'GET', headers },
  )
  if (getRes.ok) {
    await ensureSourceFields(headers)
    return
  }
  const createRes = await fetch('https://www.wixapis.com/wix-data/v2/collections', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: {
        id: STAFF_CALENDAR_SOURCES_COLLECTION,
        displayName: 'Staff calendar sources (EP planning)',
        fields: SOURCE_FIELDS.map((f) => ({
          key: f.key,
          displayName: f.displayName,
          type: f.type,
        })),
        permissions: {
          insert: 'ADMIN',
          update: 'ADMIN',
          remove: 'ADMIN',
          read: 'ADMIN',
        },
      },
    }),
  })
  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(
      `Could not create ${STAFF_CALENDAR_SOURCES_COLLECTION}: ${body.slice(0, 240)}`,
    )
  }
}
