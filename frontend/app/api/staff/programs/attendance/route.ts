/**
 * GET  /api/staff/programs/attendance?programId=&date=
 * POST /api/staff/programs/attendance { programId, sessionDate, marks[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { canAccessProgram } from '@/lib/staff/roles'
import { getProgramById } from '@/lib/api/programs'
import { getWixClient } from '@/lib/wix-client'
import {
  isAttendanceStatus,
  listActiveEnrollmentsForAttendance,
  listAttendanceForProgramDate,
  todaySessionDate,
  upsertAttendanceMarks,
  type AttendanceStatus,
} from '@/lib/programs/attendance'

async function loadStudentSafety(studentId: string) {
  if (!studentId) {
    return {
      allergies: '',
      medicalConditions: '',
      medications: '',
      emergencyContact: '',
      emergencyPhone: '',
      pickupAuthorized: '',
      parentPhone: '',
    }
  }
  try {
    const client = getWixClient()
    const s = (await client.items.get('Students', studentId)) as Record<string, unknown>
    return {
      allergies: String(s.allergies ?? ''),
      medicalConditions: String(s.medicalConditions ?? ''),
      medications: String(s.medications ?? ''),
      emergencyContact: String(s.emergencyContact ?? ''),
      emergencyPhone: String(s.emergencyPhone ?? ''),
      pickupAuthorized: String(s.pickupAuthorized ?? ''),
      parentPhone: String(s.parentPhone ?? ''),
    }
  } catch {
    return {
      allergies: '',
      medicalConditions: '',
      medications: '',
      emergencyContact: '',
      emergencyPhone: '',
      pickupAuthorized: '',
      parentPhone: '',
    }
  }
}

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
  const sessionDate =
    req.nextUrl.searchParams.get('date')?.trim() || todaySessionDate()
  if (!programId) {
    return NextResponse.json({ error: 'programId required' }, { status: 400 })
  }
  if (!canAccessProgram(session.staff, programId)) {
    return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
  }

  try {
    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

    const [enrollments, marks] = await Promise.all([
      listActiveEnrollmentsForAttendance(programId),
      listAttendanceForProgramDate(programId, sessionDate),
    ])
    const byStudent = new Map(marks.map((m) => [String(m.studentId ?? ''), m]))

    const students = await Promise.all(
      enrollments.map(async (e) => {
        const studentId = String(e.studentId ?? '')
        const mark = byStudent.get(studentId)
        const safety = await loadStudentSafety(studentId)
        return {
          studentId,
          studentName: e.studentName ?? '',
          parentEmail: e.parentEmail ?? '',
          status: mark?.status ?? '',
          notes: mark?.notes ?? '',
          checkedInAt: mark?.checkedInAt ?? null,
          checkedOutAt: mark?.checkedOutAt ?? null,
          markId: mark?._id ?? null,
          ...safety,
        }
      }),
    )

    return NextResponse.json({
      program: { id: programId, name: program.name },
      sessionDate,
      students,
    })
  } catch (err) {
    console.error('/api/staff/programs/attendance GET', err)
    return NextResponse.json({ error: 'Could not load attendance' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const programId = String(body.programId ?? '').trim()
    const sessionDate = String(body.sessionDate ?? '').trim() || todaySessionDate()
    const sessionId = String(body.sessionId ?? '').trim()
    const rawMarks = Array.isArray(body.marks) ? body.marks : []
    if (!programId) {
      return NextResponse.json({ error: 'programId required' }, { status: 400 })
    }
    if (!canAccessProgram(session.staff, programId)) {
      return NextResponse.json({ error: 'Not assigned to this program' }, { status: 403 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      return NextResponse.json({ error: 'sessionDate must be YYYY-MM-DD' }, { status: 400 })
    }

    const program = await getProgramById(programId)
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

    const enrollments = await listActiveEnrollmentsForAttendance(programId)
    const byId = new Map(enrollments.map((e) => [String(e.studentId ?? ''), e]))

    const marks: {
      studentId: string
      studentName?: string
      parentEmail?: string
      status: AttendanceStatus
      notes?: string
    }[] = []
    for (const raw of rawMarks) {
      const studentId = String(raw?.studentId ?? '').trim()
      const status = String(raw?.status ?? '').trim()
      if (!studentId || !isAttendanceStatus(status)) continue
      const enroll = byId.get(studentId)
      if (!enroll) continue
      marks.push({
        studentId,
        studentName: enroll.studentName,
        parentEmail: enroll.parentEmail,
        status,
        notes: raw?.notes != null ? String(raw.notes) : undefined,
      })
    }

    const result = await upsertAttendanceMarks({
      programId,
      programName: program.name,
      sessionDate,
      sessionId: sessionId || undefined,
      markedByEmail: session.staff.email || session.email,
      marks,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('/api/staff/programs/attendance POST', err)
    return NextResponse.json({ error: 'Could not save attendance' }, { status: 500 })
  }
}
