import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  applyMembershipsToRoster,
  buildParentRoster,
  filterParentRoster,
  membershipTierTotals,
  type ParentRosterRow,
} from '@/lib/staff/members-roster'

async function loadAllCollection(collectionId: string) {
  const client = getWixClient()
  const items: Record<string, unknown>[] = []
  let skip = 0
  const pageSize = 100
  for (let i = 0; i < 50; i += 1) {
    const result = await client.items.query(collectionId).limit(pageSize).skip(skip).find()
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
  const sort = String(req.nextUrl.searchParams.get('sort') ?? 'email').trim().toLowerCase()
  const tier = String(req.nextUrl.searchParams.get('tier') ?? 'all').trim().toLowerCase() || 'all'

  try {
    const [rawStudents, rawMemberships] = await Promise.all([
      loadAllCollection('Students'),
      loadAllCollection('Memberships'),
    ])
    const fromStudents = buildParentRoster(
      rawStudents.map((item) => ({
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
    const roster = applyMembershipsToRoster(
      fromStudents,
      rawMemberships.map((item) => ({
        email: String(item.email ?? item.parentEmail ?? ''),
        tier: String(item.tier ?? item.membershipTier ?? 'free'),
        status: String(item.status ?? 'active'),
        parentFirstName: String(item.parentFirstName ?? item.firstName ?? ''),
        parentLastName: String(item.parentLastName ?? item.lastName ?? ''),
        parentPhone: String(item.parentPhone ?? item.phone ?? ''),
      })),
    )

    function sortRoster(rows: ParentRosterRow[]): ParentRosterRow[] {
      const copy = [...rows]
      if (sort === 'name') {
        copy.sort((a, b) => {
          const an = `${a.parentLastName} ${a.parentFirstName}`.trim().toLowerCase()
          const bn = `${b.parentLastName} ${b.parentFirstName}`.trim().toLowerCase()
          if (an && bn && an !== bn) return an.localeCompare(bn)
          return a.parentEmail.localeCompare(b.parentEmail)
        })
      } else {
        copy.sort((a, b) => a.parentEmail.localeCompare(b.parentEmail))
      }
      return copy
    }

    // Full roster for VP Memberships / secretary / admin
    if (mode === 'list') {
      if (!canList) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const grade = String(req.nextUrl.searchParams.get('grade') ?? '')
      const includeArchived =
        req.nextUrl.searchParams.get('includeArchived') === '1' ||
        req.nextUrl.searchParams.get('includeArchived') === 'true'
      const filtered = sortRoster(
        filterParentRoster(roster, {
          q,
          tier,
          grade,
          includeArchived,
        }),
      )
      const byTier = membershipTierTotals(filtered)
      return NextResponse.json({
        members: filtered,
        summary: {
          parents: filtered.length,
          paid: byTier.paid,
          free: byTier.free,
          withPhone: filtered.filter((r) => Boolean(r.parentPhone)).length,
          byTier: {
            reef: byTier.reef,
            lagoon: byTier.lagoon,
            tide: byTier.tide,
            free: byTier.free,
            other: byTier.other,
          },
        },
      })
    }

    // Admin Members workspace. full list by default; optional filter via q
    if (!canLookup) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const members: ParentRosterRow[] = sortRoster(
      filterParentRoster(roster, {
        q: q.length >= 1 ? q : undefined,
        tier,
        includeArchived: true,
      }),
    )

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
