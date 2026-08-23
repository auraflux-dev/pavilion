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

async function loadStaffOptions() {
  try {
    const client = getWixClient()
    const result = await client.items.query('StaffRoles').limit(100).find()
    return (result.items ?? [])
      .filter((row) => (row as { active?: boolean }).active !== false)
      .map((row) => {
        const r = row as { email?: string; name?: string; boardTitle?: string }
        const email = String(r.email ?? '').trim().toLowerCase()
        const name = String(r.name ?? r.boardTitle ?? email).trim()
        return email ? { email, name } : null
      })
      .filter((x): x is { email: string; name: string } => Boolean(x))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccessComms(session.staff)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const audience = String(req.nextUrl.searchParams.get('audience') ?? '').trim()
  const channel = String(req.nextUrl.searchParams.get('channel') ?? '').trim()
  const kind = String(req.nextUrl.searchParams.get('kind') ?? '').trim()
  const status = String(req.nextUrl.searchParams.get('status') ?? '').trim()
  const includeDone = req.nextUrl.searchParams.get('includeDone') === 'true'
  const from = String(req.nextUrl.searchParams.get('from') ?? '').trim()
  const to = String(req.nextUrl.searchParams.get('to') ?? '').trim()

  try {
    const client = getWixClient()
    // Soft cap: active year of sends + drafts. Follow-up: true pagination before multi-year archive bloat.
    const result = await client.items.query(COLLECTION).limit(1000).find()
    let items = (result.items as Row[]).map(mapItem).filter((i) => i.active)

    if (!includeDone) {
      items = items.filter((i) => i.status !== 'published' && i.status !== 'cancelled')
    }
    if (audience) {
      const a = parseCommsAudiences(audience)
      if (a.length) items = items.filter((i) => a.some((x) => i.audiences.includes(x)))
    }
    if (channel) {
      const c = normalizeCommsChannel(channel)
      items = items.filter((i) => i.channel === c)
    }
    if (kind === 'comms' || kind === 'content') {
      items = items.filter((i) => i.kind === kind)
    }
    if (status) {
      const s = normalizeCommsStatus(status)
      items = items.filter((i) => i.status === s)
    }
    if (from) {
      const t = Date.parse(from)
      if (Number.isFinite(t)) {
        items = items.filter((i) => !i.publishAt || Date.parse(i.publishAt) >= t)
      }
    }
    if (to) {
      const t = Date.parse(to)
      if (Number.isFinite(t)) {
        items = items.filter((i) => !i.publishAt || Date.parse(i.publishAt) <= t)
      }
    }

    items.sort((a, b) => {
      const ta = Date.parse(a.publishAt) || Number.POSITIVE_INFINITY
      const tb = Date.parse(b.publishAt) || Number.POSITIVE_INFINITY
      if (ta !== tb) return ta - tb
      return a.title.localeCompare(b.title)
    })

    return NextResponse.json({
      items,
      myEmail: session.email,
      myName: session.staff.name || session.email,
      myRoles: session.staff.roles,
      staffOptions: await loadStaffOptions(),
    })
  } catch (err) {
    console.error('/api/staff/comms-calendar GET error:', err)
    return NextResponse.json(
      {
        error:
          'Could not load comms calendar. If this is the first use, run the CMS seed to create CommsCalendarItems.',
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccessComms(session.staff)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const audiences = parseCommsAudiences(body.audiences)
    const channel = normalizeCommsChannel(body.channel)
    const kind = normalizeCommsPlannerKind(body.kind, channel)
    const status = normalizeCommsStatus(body.status ?? 'idea')
    const publishAtRaw = String(body.publishAt ?? '').trim()
    const publishAt = publishAtRaw && !Number.isNaN(Date.parse(publishAtRaw)) ? publishAtRaw : ''

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!audiences.length) {
      return NextResponse.json(
        { error: 'Pick at least one audience (parents, school, or board)' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const ownerEmail =
      String(body.ownerEmail ?? session.email)
        .trim()
        .toLowerCase() || session.email
    const ownerName = String(body.ownerName ?? session.staff.name ?? ownerEmail).trim() || ownerEmail
    const assigneeEmails = parseAssigneeEmails(body.assigneeEmails)
    const assigneeGroup = String(body.assigneeGroup ?? '').trim()
    const isEvent = body.isEvent === true

    const row = {
      title,
      body: String(body.body ?? '').trim(),
      audiences: serializeCommsAudiences(audiences),
      channel,
      kind,
      status,
      publishAt: publishAt || null,
      ownerEmail,
      ownerName,
      assigneeEmails: serializeAssigneeEmails(assigneeEmails),
      assigneeGroup,
      isEvent,
      assetUrl: String(body.assetUrl ?? '').trim(),
      notes: String(body.notes ?? '').trim(),
      publishedAt: status === 'published' ? now : null,
      publishedByEmail: status === 'published' ? session.email : '',
      createdByEmail: session.email,
      createdAt: now,
      updatedAt: now,
      active: true,
    }

    const client = getWixClient()
    const inserted = await client.items.insert(COLLECTION, row)
    const id = (inserted as { _id?: string })._id ?? ''

    return NextResponse.json({
      ok: true,
      item: mapItem({ ...row, _id: id, publishAt: publishAt || null, publishedAt: row.publishedAt }),
    })
  } catch (err) {
    console.error('/api/staff/comms-calendar POST error:', err)
    return NextResponse.json(
      {
        error:
          'Could not create item. If this is the first use, run the CMS seed to create CommsCalendarItems.',
      },
      { status: 500 },
    )
  }
}
