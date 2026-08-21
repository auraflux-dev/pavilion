import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  STAFF_ROLES,
  scopedProgramIds,
  canManageAllPrograms,
  canAccessProgram,
} from '@/lib/staff/roles'
import { countSeatsTaken } from '@/lib/programs/enrollments'
import { composeScheduleField } from '@/lib/programs/schedule'
import {
  memberPriorityUntilIso,
  normalizeMemberPriorityUntilInput,
} from '@/lib/programs/registration-access'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, [...STAFF_ROLES])) {
    return null
  }
  return session
}

function dateField(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  try {
    return new Date(String(value)).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

function mapProgram(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    name: String(item.name ?? ''),
    description: normalizePlainCopy(String(item.description ?? '')),
    fee: Number(item.fee ?? 0) || 0,
    capacity: Number(item.capacity ?? 0) || 0,
    registrationOpen: item.registrationOpen === true,
    memberPriorityUntil: memberPriorityUntilIso(item.memberPriorityUntil) ?? '',
    cheddarupUrl: String(item.cheddarupUrl ?? ''),
    requiresWaiver: item.requiresWaiver === true,
    grades: String(item.grades ?? ''),
    category: String(item.category ?? ''),
    paymentType: String(item.paymentType ?? ''),
    schedule: String(item.schedule ?? ''),
    detail: normalizePlainCopy(String(item.detail ?? '')),
    tags: String(item.tags ?? ''),
    featured: item.featured === true,
    sortOrder: Number(item.sortOrder ?? 0) || 0,
    image: String(item.image ?? ''),
    dayOfWeek: String(item.dayOfWeek ?? ''),
    classTime: String(item.classTime ?? ''),
    durationWeeks: Number(item.durationWeeks ?? 0) || 0,
    startDate: dateField(item.startDate),
    endDate: dateField(item.endDate),
    instructorName: String(item.instructorName ?? ''),
    fallEpClassId: String(item.fallEpClassId ?? ''),
    location: String(item.location ?? ''),
    meetingDates: String(item.meetingDates ?? ''),
    skipsNote: String(item.skipsNote ?? ''),
    memberDiscountNote: String(item.memberDiscountNote ?? ''),
    season: String(item.season ?? ''),
  }
}

function schedulePatchFromBody(body: Record<string, unknown>, existing: Record<string, unknown>) {
  const dayOfWeek =
    body.dayOfWeek != null ? String(body.dayOfWeek).trim() : String(existing.dayOfWeek ?? '')
  const classTime =
    body.classTime != null ? String(body.classTime).trim() : String(existing.classTime ?? '')
  const durationWeeks =
    body.durationWeeks != null
      ? Number(body.durationWeeks) || 0
      : Number(existing.durationWeeks ?? 0) || 0
  const startDate =
    body.startDate != null
      ? String(body.startDate).trim().slice(0, 10) || null
      : existing.startDate ?? null
  const endDate =
    body.endDate != null
      ? String(body.endDate).trim().slice(0, 10) || null
      : existing.endDate ?? null
  const composed = composeScheduleField({
    dayOfWeek,
    classTime,
    durationWeeks,
    startDate: startDate ? String(startDate) : null,
    endDate: endDate ? String(endDate) : null,
    schedule: body.schedule != null ? String(body.schedule).trim() : String(existing.schedule ?? ''),
  })
  return {
    dayOfWeek,
    classTime,
    durationWeeks,
    startDate,
    endDate,
    schedule:
      body.schedule != null && String(body.schedule).trim()
        ? String(body.schedule).trim()
        : composed || String(existing.schedule ?? ''),
    image: body.image != null ? String(body.image).trim() : String(existing.image ?? ''),
    instructorName:
      body.instructorName != null
        ? String(body.instructorName).trim()
        : String(existing.instructorName ?? ''),
    fallEpClassId:
      body.fallEpClassId != null
        ? String(body.fallEpClassId).trim()
        : String(existing.fallEpClassId ?? ''),
    season:
      body.season != null ? String(body.season).trim() : String(existing.season ?? ''),
    location:
      body.location != null ? String(body.location).trim() : String(existing.location ?? ''),
    meetingDates:
      body.meetingDates != null
        ? String(body.meetingDates).trim()
        : String(existing.meetingDates ?? ''),
    skipsNote:
      body.skipsNote != null ? String(body.skipsNote).trim() : String(existing.skipsNote ?? ''),
    memberDiscountNote:
      body.memberDiscountNote != null
        ? String(body.memberDiscountNote).trim()
        : String(existing.memberDiscountNote ?? ''),
  }
}

function mapSession(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    programId: String(item.programId ?? ''),
    programName: String(item.programName ?? ''),
    title: String(item.title ?? ''),
    startAt: item.startAt ? new Date(String(item.startAt)).toISOString() : null,
    endAt: item.endAt ? new Date(String(item.endAt)).toISOString() : null,
    location: String(item.location ?? ''),
    instructorName: String(item.instructorName ?? ''),
    grades: String(item.grades ?? ''),
    active: item.active !== false,
  }
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const scope = scopedProgramIds(session.staff)
    const [programs, sessions] = await Promise.all([
      client.items.query('Programs').ascending('name').limit(100).find(),
      client.items.query('ProgramSessions').descending('startAt').limit(200).find(),
    ])
    let mappedPrograms = (programs.items ?? []).map((i) => mapProgram(i as Record<string, unknown>))
    let mappedSessions = (sessions.items ?? []).map((i) => mapSession(i as Record<string, unknown>))
    if (scope !== null) {
      const allowed = new Set(scope)
      mappedPrograms = mappedPrograms.filter((p) => allowed.has(p.id))
      mappedSessions = mappedSessions.filter(
        (s) => !s.programId || allowed.has(s.programId),
      )
    }

    const withSeats = await Promise.all(
      mappedPrograms.map(async (p) => {
        const seatsTaken = p.capacity > 0 ? await countSeatsTaken(p.id) : 0
        return {
          ...p,
          seatsTaken,
          seatsRemaining: p.capacity > 0 ? Math.max(0, p.capacity - seatsTaken) : null,
        }
      }),
    )

    return NextResponse.json({
      programs: withSeats,
      sessions: mappedSessions,
      canManageAll: canManageAllPrograms(session.staff),
      assignedProgramIds: scope,
    })
  } catch (err) {
    console.error('/api/staff/programs GET', err)
    return NextResponse.json({ error: 'Could not load programs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const kind = String(body.kind ?? 'session')
    const client = getWixClient()

    if (kind === 'program') {
      if (!canManageAllPrograms(session.staff)) {
        return NextResponse.json(
          { error: 'Staff access required to create programs' },
          { status: 403 },
        )
      }
      const name = String(body.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Program name required' }, { status: 400 })
      const dayOfWeek = String(body.dayOfWeek ?? '').trim()
      const classTime = String(body.classTime ?? '').trim()
      const durationWeeks = Number(body.durationWeeks ?? 0) || 0
      const startDate = String(body.startDate ?? '').trim().slice(0, 10) || null
      const endDate = String(body.endDate ?? '').trim().slice(0, 10) || null
      const schedule =
        String(body.schedule ?? '').trim() ||
        composeScheduleField({ dayOfWeek, classTime, durationWeeks, startDate, endDate })
      const row = {
        name,
        description: normalizePlainCopy(String(body.description ?? '')),
        fee: Number(body.fee ?? 0) || 0,
        capacity: Number(body.capacity ?? 0) || 0,
        registrationOpen: body.registrationOpen === true,
        memberPriorityUntil: normalizeMemberPriorityUntilInput(body.memberPriorityUntil),
        cheddarupUrl: String(body.cheddarupUrl ?? '').trim(),
        requiresWaiver: body.requiresWaiver === true,
        grades: String(body.grades ?? '').trim(),
        category: String(body.category ?? '').trim(),
        paymentType: String(body.paymentType ?? 'wix').trim(),
        schedule,
        detail: normalizePlainCopy(String(body.detail ?? '')),
        tags: String(body.tags ?? '').trim(),
        featured: body.featured === true,
        sortOrder: Number(body.sortOrder ?? 0) || 0,
        image: String(body.image ?? '').trim(),
        dayOfWeek,
        classTime,
        durationWeeks,
        startDate,
        endDate,
        location: String(body.location ?? '').trim(),
        instructorName: String(body.instructorName ?? '').trim(),
        meetingDates: String(body.meetingDates ?? '').trim(),
        skipsNote: String(body.skipsNote ?? '').trim(),
        memberDiscountNote: String(body.memberDiscountNote ?? '').trim(),
        fallEpClassId: String(body.fallEpClassId ?? '').trim(),
        season: String(body.season ?? 'fall-2026').trim() || 'fall-2026',
      }
      const inserted = await client.items.insert('Programs', row)
      return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
    }

    const programId = String(body.programId ?? '').trim()
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }
    const programName = String(body.programName ?? '').trim()
    const title = String(body.title ?? programName).trim()
    if (!programName || !title) {
      return NextResponse.json({ error: 'Program name and session title required' }, { status: 400 })
    }
    const row = {
      programId,
      programName,
      title,
      startAt: body.startAt ? new Date(String(body.startAt)).toISOString() : null,
      endAt: body.endAt ? new Date(String(body.endAt)).toISOString() : null,
      location: String(body.location ?? '').trim(),
      instructorName: String(body.instructorName ?? '').trim(),
      grades: String(body.grades ?? '').trim(),
      active: body.active !== false,
    }
    const inserted = await client.items.insert('ProgramSessions', row)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error('/api/staff/programs POST', err)
    return NextResponse.json({ error: 'Could not create' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const kind = String(body.kind ?? 'program')
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const client = getWixClient()
    const collection = kind === 'session' ? 'ProgramSessions' : 'Programs'
    const existing = (await client.items.get(collection, id)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (kind === 'session') {
      const existingProgramId = String(existing.programId ?? '')
      if (!canAccessProgram(session.staff, existingProgramId)) {
        return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
      }
      const nextProgramId =
        body.programId != null ? String(body.programId).trim() : existingProgramId
      if (nextProgramId !== existingProgramId && !canAccessProgram(session.staff, nextProgramId)) {
        return NextResponse.json({ error: 'Not assigned to target program' }, { status: 403 })
      }
      const updates = {
        ...existing,
        _id: id,
        programId: nextProgramId || existing.programId,
        programName:
          body.programName != null ? String(body.programName).trim() : existing.programName,
        title: body.title != null ? String(body.title).trim() : existing.title,
        startAt:
          body.startAt !== undefined
            ? body.startAt
              ? new Date(String(body.startAt)).toISOString()
              : null
            : existing.startAt,
        endAt:
          body.endAt !== undefined
            ? body.endAt
              ? new Date(String(body.endAt)).toISOString()
              : null
            : existing.endAt,
        location: body.location != null ? String(body.location).trim() : existing.location,
        instructorName:
          body.instructorName != null ? String(body.instructorName).trim() : existing.instructorName,
        grades: body.grades != null ? String(body.grades).trim() : existing.grades,
        active: body.active != null ? body.active !== false : existing.active !== false,
      }
      await client.items.update(collection, updates as Parameters<typeof client.items.update>[1])
      return NextResponse.json({ ok: true })
    }

    if (!canAccessProgram(session.staff, id)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }
    const scheduleFields = schedulePatchFromBody(body, existing)
    // Anyone with access to this program can edit every listed field (staff Programs page).
    const updates = {
      ...existing,
      _id: id,
      name: body.name != null ? String(body.name).trim() : existing.name,
      description:
        body.description != null
          ? normalizePlainCopy(String(body.description))
          : existing.description,
      fee: body.fee != null ? Number(body.fee) || 0 : existing.fee,
      capacity: body.capacity != null ? Number(body.capacity) || 0 : existing.capacity,
      registrationOpen:
        body.registrationOpen != null
          ? body.registrationOpen === true
          : existing.registrationOpen === true,
      memberPriorityUntil:
        body.memberPriorityUntil !== undefined
          ? normalizeMemberPriorityUntilInput(body.memberPriorityUntil)
          : existing.memberPriorityUntil ?? null,
      cheddarupUrl:
        body.cheddarupUrl != null ? String(body.cheddarupUrl).trim() : existing.cheddarupUrl,
      requiresWaiver:
        body.requiresWaiver != null
          ? body.requiresWaiver === true
          : existing.requiresWaiver === true,
      grades: body.grades != null ? String(body.grades).trim() : existing.grades,
      category: body.category != null ? String(body.category).trim() : existing.category,
      paymentType: body.paymentType != null ? String(body.paymentType).trim() : existing.paymentType,
      detail:
        body.detail != null ? normalizePlainCopy(String(body.detail)) : existing.detail,
      tags: body.tags != null ? String(body.tags).trim() : existing.tags,
      featured: body.featured != null ? body.featured === true : existing.featured === true,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) || 0 : existing.sortOrder,
      ...scheduleFields,
    }
    await client.items.update(collection, updates as Parameters<typeof client.items.update>[1])

    const nextName = String(updates.name ?? '')
    const prevName = String(existing.name ?? '')
    if (nextName && nextName !== prevName) {
      try {
        const sessionQuery = await client.items
          .query('ProgramSessions')
          .eq('programId', id)
          .limit(100)
          .find()
        for (const row of sessionQuery.items as Record<string, unknown>[]) {
          const sid = String(row._id ?? '')
          if (!sid) continue
          if (String(row.programName ?? '') === nextName) continue
          await client.items.update('ProgramSessions', {
            ...row,
            _id: sid,
            programName: nextName,
          } as Parameters<typeof client.items.update>[1])
        }
      } catch (syncErr) {
        console.error('/api/staff/programs PATCH session name sync', syncErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/programs PATCH', err)
    return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const kind = String(body.kind ?? 'program')
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const client = getWixClient()

    if (kind === 'session') {
      const existing = (await client.items.get('ProgramSessions', id)) as Record<string, unknown>
      if (!existing?._id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const programId = String(existing.programId ?? '')
      if (!canAccessProgram(session.staff, programId)) {
        return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
      }
      await client.items.remove('ProgramSessions', id)
      return NextResponse.json({ ok: true })
    }

    if (!canManageAllPrograms(session.staff)) {
      return NextResponse.json(
        { error: 'Staff access required to delete programs' },
        { status: 403 },
      )
    }
    if (!canAccessProgram(session.staff, id)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }
    await client.items.remove('Programs', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/programs DELETE', err)
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 })
  }
}
