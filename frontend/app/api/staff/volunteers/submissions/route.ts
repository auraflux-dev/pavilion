/**
 * Staff → Volunteers: list/update /volunteer form submissions (Wix Volunteers CMS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isDemoInstance } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

const STATUSES = ['new', 'contacted', 'scheduled', 'declined', 'done'] as const
type VolunteerStatus = (typeof STATUSES)[number]

function canManage(req: NextRequest) {
  return getStaffSession(req).then((session) =>
    requireStaffRole(session?.staff ?? null, ['events', 'secretary', 'admin'])
      ? session
      : null,
  )
}

function mapRow(item: Record<string, unknown>) {
  const statusRaw = String(item.status ?? 'new').trim().toLowerCase()
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as VolunteerStatus)
    : 'new'
  return {
    id: String(item._id ?? ''),
    firstName: String(item.firstName ?? '').trim(),
    lastName: String(item.lastName ?? '').trim(),
    email: String(item.email ?? '').trim().toLowerCase(),
    phone: String(item.phone ?? '').trim(),
    opportunity: String(item.opportunity ?? '').trim(),
    notes: String(item.notes ?? '').trim(),
    status,
    submittedAt: item.submittedAt
      ? String(item.submittedAt)
      : item._createdDate
        ? String(item._createdDate)
        : '',
  }
}

export async function GET(req: NextRequest) {
  if (!(await canManage(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (isDemoInstance()) {
    return NextResponse.json({
      submissions: [
        {
          id: 'demo-vol-1',
          firstName: 'Alex',
          lastName: 'Parent',
          email: 'alex.parent@example.com',
          phone: '',
          opportunity: 'Fall carnival games',
          notes: 'Can help Saturday morning',
          status: 'new',
          submittedAt: new Date().toISOString(),
        },
      ],
      demo: true,
    })
  }

  const statusFilter = String(req.nextUrl.searchParams.get('status') ?? '')
    .trim()
    .toLowerCase()

  try {
    const client = getWixClient()
    let query = client.items.query('Volunteers').limit(100)
    try {
      query = query.descending('submittedAt') as typeof query
    } catch {
      // field may be missing on older rows
    }
    const found = await query.find()
    const all = (found.items as Record<string, unknown>[]).map(mapRow).filter((r) => r.id)
    all.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
    const counts = {
      total: all.length,
      new: all.filter((s) => s.status === 'new').length,
    }
    const submissions =
      statusFilter && (STATUSES as readonly string[]).includes(statusFilter)
        ? all.filter((r) => r.status === statusFilter)
        : all
    return NextResponse.json({ submissions, counts })
  } catch (err) {
    console.error('/api/staff/volunteers/submissions GET', err)
    return NextResponse.json(
      { error: 'Could not load volunteer submissions (check Volunteers CMS collection)' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await canManage(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (isDemoInstance()) {
    return NextResponse.json({ ok: true, demo: true })
  }

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const status = String(body.status ?? '').trim().toLowerCase()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!(STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${STATUSES.join(', ')}` },
        { status: 400 },
      )
    }

    const client = getWixClient()
    const existing = (await client.items.get('Volunteers', id)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await client.items.update('Volunteers', {
      ...existing,
      _id: id,
      status,
    } as Parameters<typeof client.items.update>[1])

    return NextResponse.json({ ok: true, id, status })
  } catch (err) {
    console.error('/api/staff/volunteers/submissions PATCH', err)
    return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  }
}
