/**
 * GET/POST /api/staff/programs/calendar-sources
 * Staff planning overlays: LCPS ICS URL or pasted ICS text.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  ensureStaffCalendarSourcesCollection,
  mapStaffCalendarSource,
  normalizeTone,
  refreshEventsFromSource,
  serializeCachedEvents,
  STAFF_CALENDAR_SOURCES_COLLECTION,
  type StaffCalendarSourceRow,
} from '@/lib/programs/calendar-sources'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function canAccess(staff: Parameters<typeof requireStaffRole>[0]) {
  return (
    requireStaffRole(staff, 'admin') ||
    requireStaffRole(staff, 'programs') ||
    requireStaffRole(staff, 'coordinator')
  )
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!canAccess(session?.staff ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    await ensureStaffCalendarSourcesCollection()
    const client = getWixClient()
    const result = await client.items.query(STAFF_CALENDAR_SOURCES_COLLECTION).limit(100).find()
    const sources = (result.items as StaffCalendarSourceRow[])
      .map(mapStaffCalendarSource)
      .filter((s) => s.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ sources })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load calendar sources' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!canAccess(session?.staff ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      kind?: string
      sourceUrl?: string
      icsText?: string
      tone?: string
      active?: boolean
    }
    const name = String(body.name ?? '').trim() || 'School calendar'
    const kind = String(body.kind ?? '').trim() === 'ics_paste' ? 'ics_paste' : 'ics_url'
    const sourceUrl = String(body.sourceUrl ?? '').trim()
    const icsText = String(body.icsText ?? '')
    if (kind === 'ics_url' && !sourceUrl) {
      return NextResponse.json({ error: 'Paste an ICS or webcal URL' }, { status: 400 })
    }
    if (kind === 'ics_paste' && !icsText.trim()) {
      return NextResponse.json({ error: 'Paste ICS calendar text' }, { status: 400 })
    }

    await ensureStaffCalendarSourcesCollection()
    const refreshed = await refreshEventsFromSource({
      kind,
      sourceUrl,
      icsText,
    })
    const now = new Date().toISOString()
    const client = getWixClient()
    const inserted = await client.items.insert(STAFF_CALENDAR_SOURCES_COLLECTION, {
      name,
      kind,
      sourceUrl: kind === 'ics_url' ? sourceUrl : '',
      tone: normalizeTone(body.tone),
      active: body.active !== false,
      refreshedAt: now,
      lastError: refreshed.error,
      cachedEventsJson: serializeCachedEvents(refreshed.events),
      createdByEmail: String(session?.staff?.email ?? '').toLowerCase(),
      updatedAt: now,
    })
    const mapped = mapStaffCalendarSource(inserted as StaffCalendarSourceRow)
    return NextResponse.json({
      source: mapped,
      warning: refreshed.error || undefined,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not add calendar' },
      { status: 500 },
    )
  }
}
