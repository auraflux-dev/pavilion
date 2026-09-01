/**
 * GET  /api/staff/programs/enrollments?programId=
 * PATCH /api/staff/programs/enrollments
 *   { id, status }. promote waitlist / cancel / refund statuses
 *   { action: 'transfer', id, toProgramId, toProgramName? }
 *   { action: 'refund', id, note? }
 * POST  /api/staff/programs/enrollments { action: 'message-class', programId, subject, body }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  STAFF_ROLES,
  canAccessProgram,
  canManageAllPrograms,
  scopedProgramIds,
} from '@/lib/staff/roles'
import {
  ACTIVE_ENROLL_STATUSES,
  ALL_ENROLL_STATUSES,
  WAITLIST_STATUS,
  countSeatsTaken,
  isHistoricalEnrollmentStatus,
  listProgramEnrollments,
  promoteFirstWaitlisted,
  updateLegacyEnrollmentStatus,
} from '@/lib/programs/enrollments'
import { getProgramById } from '@/lib/api/programs'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, [...STAFF_ROLES])) {
    return null
  }
  return session
}

type StudentSafetyFields = {
  allergies: string
  medicalConditions: string
  medications: string
  emergencyContact: string
  emergencyPhone: string
  pickupAuthorized: string
  parentPhone: string
}

async function loadStudentSafetyMap(studentIds: string[]): Promise<Map<string, StudentSafetyFields>> {
  const unique = Array.from(new Set(studentIds.filter(Boolean)))
  const map = new Map<string, StudentSafetyFields>()
  if (!unique.length) return map

  const client = getWixClient()
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const row = (await client.items.get('Students', id)) as Record<string, unknown>
        return [id, row] as const
      } catch {
        return [id, null] as const
      }
    }),
  )

  for (const [id, row] of results) {
    map.set(id, {
      allergies: String(row?.allergies ?? ''),
      medicalConditions: String(row?.medicalConditions ?? ''),
      medications: String(row?.medications ?? ''),
      emergencyContact: String(row?.emergencyContact ?? ''),
      emergencyPhone: String(row?.emergencyPhone ?? ''),
      pickupAuthorized: String(row?.pickupAuthorized ?? ''),
      parentPhone: String(row?.parentPhone ?? ''),
    })
  }
  return map
}

async function maybePromoteAfterSeatFreed(
  programId: string,
  previousStatus: string,
  nextStatus: string,
) {
  const wasSeat = ACTIVE_ENROLL_STATUSES.has(previousStatus)
  const freesSeat = nextStatus === 'Cancelled' || nextStatus === 'Refunded'
  if (!wasSeat || !freesSeat) return null
  return promoteFirstWaitlisted(programId)
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

    const rows = (await listProgramEnrollments(programId)).filter(
      (r) => !isHistoricalEnrollmentStatus(r.status),
    )
    const safetyMap = await loadStudentSafetyMap(rows.map((r) => String(r.studentId ?? '')))
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
      enrollments: rows.map((r) => {
        const safety = safetyMap.get(String(r.studentId ?? '')) ?? {
          allergies: '',
          medicalConditions: '',
          medications: '',
          emergencyContact: '',
          emergencyPhone: '',
          pickupAuthorized: '',
          parentPhone: '',
        }
        return {
          id: r._id,
          studentId: r.studentId ?? '',
          studentName: r.studentName ?? '',
          parentEmail: r.parentEmail ?? '',
          status: r.status ?? '',
          feePaid: r.feePaid ?? 0,
          enrolledAt: r.enrolledAt ?? null,
          waitlistPosition: r.waitlistPosition ?? null,
          transactionId: r.transactionId ?? '',
          requestNote: r.requestNote ?? '',
          requestedToProgramId: r.requestedToProgramId ?? '',
          requestedToProgramName: r.requestedToProgramName ?? '',
          transferToProgramId: (r as { requestedToProgramId?: string }).requestedToProgramId ?? '',
          transferToProgramName:
            (r as { requestedToProgramName?: string }).requestedToProgramName ?? '',
          ...safety,
        }
      }),
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
    const action = String(body.action ?? '').trim()
    const id = String(body.id ?? '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const client = getWixClient()
    const existing = (await client.items.get('ProgramEnrollments', id)) as Record<string, unknown>
    const programId = String(existing.programId ?? '')
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }

    const previousStatus = String(existing.status ?? '')

    if (action === 'transfer') {
      const toProgramId = String(body.toProgramId ?? '').trim()
      const toProgramNameIn = String(body.toProgramName ?? '').trim()
      if (!toProgramId) {
        return NextResponse.json({ error: 'toProgramId required' }, { status: 400 })
      }
      if (!canAccessProgram(session.staff, toProgramId)) {
        return NextResponse.json({ error: 'Not assigned to destination program' }, { status: 403 })
      }
      const dest = await getProgramById(toProgramId)
      if (!dest) return NextResponse.json({ error: 'Destination program not found' }, { status: 404 })

      const capacity = Number(dest.capacity ?? 0) || 0
      if (capacity > 0) {
        const seats = await countSeatsTaken(toProgramId)
        if (seats >= capacity) {
          return NextResponse.json({ error: 'Destination class is full' }, { status: 409 })
        }
      }

      const toProgramName = toProgramNameIn || dest.name
      const keepSeatStatus = ACTIVE_ENROLL_STATUSES.has(previousStatus)
        ? previousStatus === 'Paid' || Number(existing.feePaid ?? 0) > 0
          ? 'Paid'
          : 'Enrolled'
        : previousStatus === WAITLIST_STATUS
          ? WAITLIST_STATUS
          : Number(existing.feePaid ?? 0) > 0
            ? 'Paid'
            : 'Enrolled'

      await client.items.update('ProgramEnrollments', {
        ...existing,
        _id: id,
        programId: toProgramId,
        programName: toProgramName,
        status: keepSeatStatus,
        waitlistPosition: keepSeatStatus === WAITLIST_STATUS ? existing.waitlistPosition : null,
        requestNote: '',
        requestedToProgramId: '',
        requestedToProgramName: '',
        transferredAt: new Date().toISOString(),
        transferredFromProgramId: programId,
      } as never)

      await updateLegacyEnrollmentStatus({
        programId,
        studentId: String(existing.studentId ?? ''),
        status: keepSeatStatus,
        programName: toProgramName,
        programIdNext: toProgramId,
      })

      const promoted =
        ACTIVE_ENROLL_STATUSES.has(previousStatus) && programId !== toProgramId
          ? await promoteFirstWaitlisted(programId)
          : null

      return NextResponse.json({ ok: true, status: keepSeatStatus, promoted })
    }

    if (action === 'refund') {
      const note = String(body.note ?? '').trim()
      const nextStatus = 'Refunded'
      await client.items.update('ProgramEnrollments', {
        ...existing,
        _id: id,
        status: nextStatus,
        waitlistPosition: null,
        refundNote: note || existing.refundNote || '',
        refundedAt: new Date().toISOString(),
        refundedByEmail: session.staff.email || session.email,
      } as never)

      await updateLegacyEnrollmentStatus({
        programId,
        studentId: String(existing.studentId ?? ''),
        status: nextStatus,
      })

      const promoted = await maybePromoteAfterSeatFreed(programId, previousStatus, nextStatus)
      return NextResponse.json({
        ok: true,
        status: nextStatus,
        promoted,
        squareRefund: 'skipped',
        note: 'CMS status set to Refunded. Process Square refund manually if needed.',
      })
    }

    const status = String(body.status ?? '').trim()
    if (!status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }
    if (!(ALL_ENROLL_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (ACTIVE_ENROLL_STATUSES.has(status)) {
      const program = await getProgramById(programId)
      const capacity = Number(program?.capacity ?? 0) || 0
      if (capacity > 0) {
        const seats = await countSeatsTaken(programId)
        const alreadySeat = ACTIVE_ENROLL_STATUSES.has(previousStatus)
        if (!alreadySeat && seats >= capacity) {
          return NextResponse.json({ error: 'Class is full. free a seat before promoting' }, { status: 409 })
        }
      }
    }

    await client.items.update('ProgramEnrollments', {
      ...existing,
      _id: id,
      status,
      waitlistPosition: status === WAITLIST_STATUS ? existing.waitlistPosition : null,
    } as never)

    await updateLegacyEnrollmentStatus({
      programId,
      studentId: String(existing.studentId ?? ''),
      status,
    })

    const promoted = await maybePromoteAfterSeatFreed(programId, previousStatus, status)
    try {
      const { revalidatePublicPrograms } = await import('@/lib/staff/revalidate-public')
      revalidatePublicPrograms()
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true, promoted })
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
