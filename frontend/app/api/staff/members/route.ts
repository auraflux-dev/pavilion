import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  buildParentRoster,
  filterParentRoster,
  type ParentRosterRow,
} from '@/lib/staff/members-roster'

async function loadAllStudents() {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  const pageSize = 100
  for (let i = 0; i < 20; i += 1) {
    const result = await client.items.query('Students').limit(pageSize).skip(skip).find()
    const batch = (result.items ?? []) as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < pageSize) break
    skip += pageSize
  }
  return items
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  const canList = requireStaffRole(session.staff, ['membership', 'secretary', 'admin'])
  const canLookup = requireStaffRole(session.staff, 'admin')

  if (!canList && !canLookup) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mode = String(req.nextUrl.searchParams.get('mode') ?? '').trim() || 'search'
  const q = String(req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()

  try {
    const raw = await loadAllStudents()
    const roster = buildParentRoster(
      raw.map((item) => ({
        _id: String(item._id ?? ''),
        parentEmail: String(item.parentEmail ?? ''),
        parentFirstName: String(item.parentFirstName ?? ''),
        parentLastName: String(item.parentLastName ?? ''),
        parentPhone: String(item.parentPhone ?? ''),
        firstName: String(item.firstName ?? ''),
        lastName: String(item.lastName ?? ''),
        grade: String(item.grade ?? ''),
        membershipTier: String(item.membershipTier ?? 'free'),
        membershipStatus: String(item.membershipStatus ?? 'active'),
        archived: item.archived === true,
      })),
    )

    // Full roster for VP Memberships / secretary / admin
    if (mode === 'list') {
      if (!canList) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const tier = String(req.nextUrl.searchParams.get('tier') ?? 'all')
      const grade = String(req.nextUrl.searchParams.get('grade') ?? '')
      const includeArchived =
        req.nextUrl.searchParams.get('includeArchived') === '1' ||
        req.nextUrl.searchParams.get('includeArchived') === 'true'
      const filtered = filterParentRoster(roster, {
        q,
        tier,
        grade,
        includeArchived,
      })
      const paid = filtered.filter((r) => r.accountType === 'paid').length
      const free = filtered.filter((r) => r.accountType === 'free').length
      return NextResponse.json({
        members: filtered,
        summary: {
          parents: filtered.length,
          paid,
          free,
          withPhone: filtered.filter((r) => Boolean(r.parentPhone)).length,
        },
      })
    }

    // Legacy admin search (act-as / archive)
    if (!canLookup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (q.length < 2) {
      return NextResponse.json({ error: 'Enter at least 2 characters' }, { status: 400 })
    }

    const members: ParentRosterRow[] = filterParentRoster(roster, {
      q,
      includeArchived: true,
    }).slice(0, 40)

    return NextResponse.json({
      members: members.map((m) => ({
        parentEmail: m.parentEmail,
        parentFirstName: m.parentFirstName,
        parentLastName: m.parentLastName,
        parentPhone: m.parentPhone,
        membershipTier: m.membershipTier,
        accountType: m.accountType,
        students: m.students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          grade: s.grade,
          membershipTier: s.membershipTier,
          archived: s.archived,
        })),
      })),
    })
  } catch (err) {
    console.error('/api/staff/members GET error:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
