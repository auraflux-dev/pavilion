import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  normalizeCommsChannel,
  normalizeCommsPlannerKind,
  normalizeCommsStatus,
  parseCommsAudiences,
  parseAssigneeEmails,
  serializeAssigneeEmails,
  serializeCommsAudiences,
  type CommsCalendarItem,
} from '@/lib/staff/comms-calendar'

const COLLECTION = 'CommsCalendarItems'

type Row = {
  _id?: string
  title?: string
  body?: string
  audiences?: string
  channel?: string
  kind?: string
  status?: string
  publishAt?: string | Date | null
  ownerEmail?: string
  ownerName?: string
  assigneeEmails?: string
  assigneeGroup?: string
  isEvent?: boolean
  assetUrl?: string
  notes?: string
  publishedAt?: string | Date | null
  publishedByEmail?: string
  createdByEmail?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  active?: boolean
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

function mapItem(row: Row): CommsCalendarItem {
  return {
    id: row._id ?? '',
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    audiences: parseCommsAudiences(row.audiences),
    channel: normalizeCommsChannel(row.channel),
    kind: normalizeCommsPlannerKind(row.kind, normalizeCommsChannel(row.channel)),
    status: normalizeCommsStatus(row.status),
    publishAt: toIso(row.publishAt),
    ownerEmail: String(row.ownerEmail ?? '').toLowerCase(),
    ownerName: String(row.ownerName ?? ''),
    assigneeEmails: parseAssigneeEmails(row.assigneeEmails),
    assigneeGroup: String(row.assigneeGroup ?? ''),
    isEvent: row.isEvent === true,
    assetUrl: String(row.assetUrl ?? ''),
    notes: String(row.notes ?? ''),
    publishedAt: toIso(row.publishedAt),
    publishedByEmail: String(row.publishedByEmail ?? '').toLowerCase(),
    createdByEmail: String(row.createdByEmail ?? '').toLowerCase(),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    active: row.active !== false,
  }
}

function canAccessComms(staff: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>['staff']) {
  return (
    requireStaffRole(staff, 'admin') ||
    requireStaffRole(staff, 'marketing') ||
    requireStaffRole(staff, 'secretary') ||
    requireStaffRole(staff, 'membership') ||
    requireStaffRole(staff, 'events')
  )
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccessComms(session.staff)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const client = getWixClient()
    const existing = (await client.items.get(COLLECTION, id)) as Row
    if (!existing?._id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const current = mapItem(existing)
    const nextStatus =
      body.status != null ? normalizeCommsStatus(body.status) : current.status
    const nextChannel =
      body.channel != null ? normalizeCommsChannel(body.channel) : current.channel
    const nextKind =
      body.kind != null || body.channel != null
        ? normalizeCommsPlannerKind(body.kind ?? current.kind, nextChannel)
        : current.kind
    const publishAtRaw =
      body.publishAt !== undefined ? String(body.publishAt ?? '').trim() : current.publishAt
    const publishAt =
      publishAtRaw && !Number.isNaN(Date.parse(publishAtRaw)) ? publishAtRaw : ''

    let audiences = current.audiences
    if (body.audiences !== undefined) {
      audiences = parseCommsAudiences(body.audiences)
      if (!audiences.length) {
        return NextResponse.json({ error: 'Pick at least one audience' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    let publishedAt = current.publishedAt
    let publishedByEmail = current.publishedByEmail
    if (nextStatus === 'published' && current.status !== 'published') {
      publishedAt = now
      publishedByEmail = session.email
    }
    if (nextStatus !== 'published' && body.clearPublished) {
      publishedAt = ''
      publishedByEmail = ''
    }

    const updates: Row = {
      ...existing,
      _id: id,
      title: body.title != null ? String(body.title).trim() : existing.title,
      body: body.body != null ? String(body.body).trim() : existing.body,
      audiences: serializeCommsAudiences(audiences),
      channel: nextChannel,
      kind: nextKind,
      status: nextStatus,
      publishAt: publishAt || null,
      ownerEmail:
        body.ownerEmail != null
          ? String(body.ownerEmail).trim().toLowerCase()
          : existing.ownerEmail,
      ownerName: body.ownerName != null ? String(body.ownerName).trim() : existing.ownerName,
      assigneeEmails:
        body.assigneeEmails != null
          ? serializeAssigneeEmails(parseAssigneeEmails(body.assigneeEmails))
          : existing.assigneeEmails,
      assigneeGroup:
        body.assigneeGroup != null ? String(body.assigneeGroup).trim() : existing.assigneeGroup,
      isEvent: body.isEvent != null ? body.isEvent === true : existing.isEvent === true,
      assetUrl: body.assetUrl != null ? String(body.assetUrl).trim() : existing.assetUrl,
      notes: body.notes != null ? String(body.notes).trim() : existing.notes,
      publishedAt: publishedAt || null,
      publishedByEmail: publishedByEmail || '',
      active: body.active === false ? false : existing.active !== false,
      updatedAt: now,
    }

    if (body.title != null && !String(body.title).trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    await client.items.update(COLLECTION, updates as Parameters<typeof client.items.update>[1])
    return NextResponse.json({
      ok: true,
      item: mapItem({ ...updates, publishAt: publishAt || undefined }),
    })
  } catch (err) {
    console.error('/api/staff/comms-calendar/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Could not update item' }, { status: 500 })
  }
}
