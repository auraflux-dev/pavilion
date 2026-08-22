/**
 * PATCH/DELETE /api/staff/programs/calendar-sources/[id]
 * Refresh ICS or toggle active / remove overlay source.
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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getStaffSession(req)
  if (!canAccess(session?.staff ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await ensureStaffCalendarSourcesCollection()
    const client = getWixClient()
    const existing = (await client.items.get(
      STAFF_CALENDAR_SOURCES_COLLECTION,
      id,
    )) as StaffCalendarSourceRow
    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      sourceUrl?: string
      tone?: string
      active?: boolean
      refresh?: boolean
      icsText?: string
    }

    const kind =
      String(existing.kind ?? '').trim() === 'ics_paste' ? 'ics_paste' : 'ics_url'
    const sourceUrl =
      body.sourceUrl != null ? String(body.sourceUrl).trim() : String(existing.sourceUrl ?? '')
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }
    if (body.name != null) patch.name = String(body.name).trim() || existing.name
    if (body.sourceUrl != null) patch.sourceUrl = sourceUrl
    if (body.tone != null) patch.tone = normalizeTone(body.tone)
    if (body.active != null) patch.active = Boolean(body.active)

    if (body.refresh || body.icsText) {
      const refreshed = await refreshEventsFromSource({
        kind,
        sourceUrl,
        icsText: body.icsText,
      })
      patch.refreshedAt = new Date().toISOString()
      patch.lastError = refreshed.error
      patch.cachedEventsJson = serializeCachedEvents(refreshed.events)
    }

    const updated = await client.items.update(STAFF_CALENDAR_SOURCES_COLLECTION, {
      ...existing,
      ...patch,
      _id: id,
    })
    return NextResponse.json({ source: mapStaffCalendarSource(updated as StaffCalendarSourceRow) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update calendar' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getStaffSession(_req)
  if (!canAccess(session?.staff ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await ensureStaffCalendarSourcesCollection()
    const client = getWixClient()
    await client.items.remove(STAFF_CALENDAR_SOURCES_COLLECTION, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not remove calendar' },
      { status: 500 },
    )
  }
}
