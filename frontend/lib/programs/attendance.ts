/**
 * ProgramAttendance helpers. check-in / check-out marks per session date.
 * Fields: programId, programName, sessionId?, sessionDate (YYYY-MM-DD),
 * studentId, studentName, parentEmail, status (Present|Absent|Late|CheckedOut),
 * checkedInAt, checkedOutAt, markedByEmail, notes
 */
import { getWixClient } from '@/lib/wix-client'
import { ACTIVE_ENROLL_STATUSES, listProgramEnrollments } from '@/lib/programs/enrollments'

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'CheckedOut'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export type ProgramAttendanceRow = {
  _id?: string
  programId?: string
  programName?: string
  sessionId?: string
  sessionDate?: string
  studentId?: string
  studentName?: string
  parentEmail?: string
  status?: string
  checkedInAt?: string | null
  checkedOutAt?: string | null
  markedByEmail?: string
  notes?: string
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value)
}

export function todaySessionDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function listAttendanceForProgramDate(
  programId: string,
  sessionDate: string,
): Promise<ProgramAttendanceRow[]> {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramAttendance')
    .eq('programId', programId)
    .eq('sessionDate', sessionDate)
    .limit(200)
    .find()
    .catch(() => ({ items: [] as ProgramAttendanceRow[] }))
  return (found.items ?? []) as ProgramAttendanceRow[]
}

export async function listAttendanceForParentEmail(
  parentEmail: string,
  limit = 80,
): Promise<ProgramAttendanceRow[]> {
  const client = getWixClient()
  const email = parentEmail.trim().toLowerCase()
  const found = await client.items
    .query('ProgramAttendance')
    .eq('parentEmail', email)
    .descending('sessionDate')
    .limit(limit)
    .find()
    .catch(() => ({ items: [] as ProgramAttendanceRow[] }))
  return (found.items ?? []) as ProgramAttendanceRow[]
}

export async function listActiveEnrollmentsForAttendance(programId: string) {
  const rows = await listProgramEnrollments(programId)
  return rows.filter((r) => ACTIVE_ENROLL_STATUSES.has(String(r.status ?? '')))
}

export function timestampsForStatus(
  status: AttendanceStatus,
  existing?: ProgramAttendanceRow,
): { checkedInAt: string | null; checkedOutAt: string | null } {
  const now = new Date().toISOString()
  if (status === 'Absent') {
    return { checkedInAt: null, checkedOutAt: null }
  }
  if (status === 'CheckedOut') {
    return {
      checkedInAt: existing?.checkedInAt || now,
      checkedOutAt: now,
    }
  }
  // Present | Late
  return {
    checkedInAt: existing?.checkedInAt || now,
    checkedOutAt: null,
  }
}

export async function upsertAttendanceMarks(opts: {
  programId: string
  programName: string
  sessionDate: string
  sessionId?: string
  markedByEmail: string
  marks: { studentId: string; studentName?: string; parentEmail?: string; status: AttendanceStatus; notes?: string }[]
}): Promise<{ upserted: number }> {
  const client = getWixClient()
  const existing = await listAttendanceForProgramDate(opts.programId, opts.sessionDate)
  const byStudent = new Map(
    existing.map((row) => [String(row.studentId ?? ''), row] as const),
  )

  let upserted = 0
  for (const mark of opts.marks) {
    const studentId = String(mark.studentId ?? '').trim()
    if (!studentId || !isAttendanceStatus(mark.status)) continue
    const prev = byStudent.get(studentId)
    const times = timestampsForStatus(mark.status, prev)
    const row = {
      programId: opts.programId,
      programName: opts.programName,
      sessionId: opts.sessionId ?? prev?.sessionId ?? '',
      sessionDate: opts.sessionDate,
      studentId,
      studentName: mark.studentName || prev?.studentName || '',
      parentEmail: (mark.parentEmail || prev?.parentEmail || '').trim().toLowerCase(),
      status: mark.status,
      checkedInAt: times.checkedInAt,
      checkedOutAt: times.checkedOutAt,
      markedByEmail: opts.markedByEmail,
      notes: mark.notes ?? prev?.notes ?? '',
    }
    if (prev?._id) {
      await client.items.update('ProgramAttendance', { ...prev, ...row, _id: prev._id } as never)
    } else {
      await client.items.insert('ProgramAttendance', row)
    }
    upserted += 1
  }
  return { upserted }
}
