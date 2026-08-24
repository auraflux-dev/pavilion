import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canManageAllPrograms } from '@/lib/staff/roles'
import {
  spring2027ProgramInsertRow,
  missingSpring2027SeedPrograms,
} from '@/lib/programs/seed-spring-2027-programs'
import { revalidatePublicPrograms } from '@/lib/staff/revalidate-public'
import type { Program } from '@/lib/api/programs'

function mapProgram(item: Record<string, unknown>): Program {
  return {
    _id: String(item._id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    fee: Number(item.fee ?? 0) || 0,
    capacity: Number(item.capacity ?? 0) || 0,
    registrationOpen: item.registrationOpen === true,
    requiresWaiver: item.requiresWaiver === true,
    grades: String(item.grades ?? ''),
    category: String(item.category ?? ''),
    featured: item.featured === true,
    sortOrder: Number(item.sortOrder ?? 0) || 0,
    dayOfWeek: String(item.dayOfWeek ?? ''),
    classTime: String(item.classTime ?? ''),
    durationWeeks: Number(item.durationWeeks ?? 0) || 0,
    startDate: String(item.startDate ?? '').slice(0, 10),
    endDate: String(item.endDate ?? '').slice(0, 10),
    location: String(item.location ?? ''),
    instructorName: String(item.instructorName ?? ''),
    meetingDates: String(item.meetingDates ?? ''),
    skipsNote: String(item.skipsNote ?? ''),
    memberDiscountNote: String(item.memberDiscountNote ?? ''),
    fallEpClassId: String(item.fallEpClassId ?? ''),
    season: String(item.season ?? ''),
    tags: String(item.tags ?? ''),
    schedule: String(item.schedule ?? ''),
  } as Program
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session || !requireStaffRole(session.staff, ['admin', 'programs'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!canManageAllPrograms(session.staff)) {
    return NextResponse.json({ error: 'Staff access required to seed programs' }, { status: 403 })
  }

  try {
    const client = getWixClient()
    const result = await client.items.query('Programs').limit(200).find()
    const existing = (result.items ?? []).map((i) => mapProgram(i as Record<string, unknown>))
    const toCreate = missingSpring2027SeedPrograms(existing)

    if (toCreate.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        message: 'All four Spring 2027 packet classes already exist in CMS.',
      })
    }

    const created: string[] = []
    for (const staging of toCreate) {
      const row = spring2027ProgramInsertRow(staging)
      const inserted = await client.items.insert('Programs', row)
      const id = String((inserted as { _id?: string })._id ?? '')
      if (id) created.push(id)
    }

    revalidatePublicPrograms()
    return NextResponse.json({
      ok: true,
      created: created.length,
      ids: created,
      message: `Created ${created.length} Spring 2027 program${created.length === 1 ? '' : 's'}.`,
    })
  } catch (err) {
    console.error('/api/staff/programs/seed-spring POST', err)
    return NextResponse.json({ error: 'Could not seed Spring programs' }, { status: 500 })
  }
}
