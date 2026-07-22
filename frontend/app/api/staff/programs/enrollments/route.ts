/**
 * GET  /api/staff/programs/enrollments?programId=
 * PATCH /api/staff/programs/enrollments { id, status } — promote waitlist / cancel
 * POST  /api/staff/programs/enrollments { action: 'message-class', programId, subject, body }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  canAccessProgram,
  canManageAllPrograms,
  scopedProgramIds,
} from '@/lib/staff/roles'
import {
  ACTIVE_ENROLL_STATUSES,
  WAITLIST_STATUS,
  countSeatsTaken,
  listProgramEnrollments,
} from '@/lib/programs/enrollments'
import { getProgramById } from '@/lib/api/programs'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'programs',
      'instructor',
      'coordinator',
      'admin',
    ])
  ) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const programId = req.nextUrl.searchParams.get('programId')?.trim() || ''
  if (!programId) {
    return NextResponse.json({ error: 'programId required' }, { status: 400 })
  }
  if (!canAccessProgram(session.staff, programId)) {
    return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
  }

  try {
    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

    const rows = await listProgramEnrollments(programId)
    const seatsTaken = await countSeatsTaken(programId)
    const capacity = Number(program.capacity ?? 0) || 0
    const waitlisted = rows.filter((r) => String(r.status) === WAITLIST_STATUS).length
    const enrolled = rows.filter((r) => ACTIVE_ENROLL_STATUSES.has(String(r.status ?? ''))).length

    return NextResponse.json({
      program: {
        id: programId,
        name: program.name,
        capacity,
        seatsTaken,
        enrolled,
        waitlisted,
        seatsRemaining: capacity > 0 ? Math.max(0, capacity - seatsTaken) : null,
      },
      enrollments: rows.map((r) => ({
        id: r._id,
        studentId: r.studentId ?? '',
        studentName: r.studentName ?? '',
        parentEmail: r.parentEmail ?? '',
        status: r.status ?? '',
        feePaid: r.feePaid ?? 0,
        enrolledAt: r.enrolledAt ?? null,
        waitlistPosition: r.waitlistPosition ?? null,
        transactionId: r.transactionId ?? '',
      })),
      canEditAll: canManageAllPrograms(session.staff),
      scoped: scopedProgramIds(session.staff),
    })
  } catch (err) {
    console.error('/api/staff/programs/enrollments GET', err)
    return NextResponse.json({ error: 'Could not load roster' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    const status = String(body.status ?? '').trim()
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }
    if (!['Enrolled', 'Paid', WAITLIST_STATUS, 'Cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const client = getWixClient()
    const existing = (await client.items.get('ProgramEnrollments', id)) as Record<string, unknown>
    const programId = String(existing.programId ?? '')
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }

    if (ACTIVE_ENROLL_STATUSES.has(status)) {
      const program = await getProgramById(programId)
      const capacity = Number(program?.capacity ?? 0) || 0
      if (capacity > 0) {
        const seats = await countSeatsTaken(programId)
        const alreadySeat = ACTIVE_ENROLL_STATUSES.has(String(existing.status ?? ''))
        if (!alreadySeat && seats >= capacity) {
          return NextResponse.json({ error: 'Class is full — free a seat before promoting' }, { status: 409 })
        }
      }
    }

    await client.items.update('ProgramEnrollments', {
      ...existing,
      _id: id,
      status,
      waitlistPosition: status === WAITLIST_STATUS ? existing.waitlistPosition : null,
    } as never)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/staff/programs/enrollments PATCH', err)
    return NextResponse.json({ error: 'Could not update enrollment' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    if (String(body.action ?? '') !== 'message-class') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    const programId = String(body.programId ?? '').trim()
    const subject = String(body.subject ?? '').trim()
    const message = String(body.body ?? '').trim()
    if (!programId || !subject || !message) {
      return NextResponse.json({ error: 'programId, subject, and body required' }, { status: 400 })
    }
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }

    const program = await getProgramById(programId)
    const rows = await listProgramEnrollments(programId)
    const parents = Array.from(
      new Set(
        rows
          .filter((r) => {
            const s = String(r.status ?? '')
            return ACTIVE_ENROLL_STATUSES.has(s) || s === WAITLIST_STATUS
          })
          .map((r) => String(r.parentEmail ?? '').trim().toLowerCase())
          .filter(Boolean),
      ),
    )
    if (!parents.length) {
      return NextResponse.json({ error: 'No parents on this roster yet' }, { status: 400 })
    }

    const client = getWixClient()
    const fromName = session.staff.name || session.staff.boardTitle || session.email
    const sentAt = new Date().toISOString()
    for (const parentEmail of parents) {
      await client.items.insert('ParentMessages', {
        parentEmail,
        audience: 'program',
        grade: null,
        studentId: null,
        studentName: null,
        programName: program?.name || programId,
        fromName,
        subject,
        body: message,
        sentAt,
        active: true,
      })
    }

    return NextResponse.json({ ok: true, recipients: parents.length })
  } catch (err) {
    console.error('/api/staff/programs/enrollments POST', err)
    return NextResponse.json({ error: 'Could not message class' }, { status: 500 })
  }
}
