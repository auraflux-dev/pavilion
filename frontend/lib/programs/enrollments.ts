/**
 * Shared program enrollment helpers — seats, waitlist, dual-write for portal.
 */
import { getWixClient } from '@/lib/wix-client'

export const ACTIVE_ENROLL_STATUSES = new Set(['Enrolled', 'Paid'])
export const WAITLIST_STATUS = 'Waitlisted'
export const SEAT_STATUSES = new Set(['Enrolled', 'Paid']) // count toward capacity

export type ProgramEnrollmentRow = {
  _id?: string
  programId?: string
  programName?: string
  studentId?: string
  studentName?: string
  parentEmail?: string
  status?: string
  feePaid?: number
  transactionId?: string
  enrolledAt?: string
  registrationDate?: string
  paymentAmount?: number
  waitlistPosition?: number
}

export async function countSeatsTaken(programId: string): Promise<number> {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('programId', programId)
    .limit(200)
    .find()
  return (found.items ?? []).filter((item) =>
    SEAT_STATUSES.has(String((item as ProgramEnrollmentRow).status ?? '')),
  ).length
}

export async function nextWaitlistPosition(programId: string): Promise<number> {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('programId', programId)
    .eq('status', WAITLIST_STATUS)
    .limit(200)
    .find()
  return (found.items?.length ?? 0) + 1
}

export async function listProgramEnrollments(programId: string): Promise<ProgramEnrollmentRow[]> {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('programId', programId)
    .limit(200)
    .find()
  const rows = (found.items ?? []) as ProgramEnrollmentRow[]
  return rows.sort((a, b) => {
    const ta = String(a.enrolledAt ?? '')
    const tb = String(b.enrolledAt ?? '')
    return ta.localeCompare(tb)
  })
}

export async function listEnrollmentsForStudent(studentId: string): Promise<ProgramEnrollmentRow[]> {
  const client = getWixClient()
  const [modern, legacy] = await Promise.all([
    client.items
      .query('ProgramEnrollments')
      .eq('studentId', studentId)
      .descending('enrolledAt')
      .limit(40)
      .find()
      .catch(() => ({ items: [] as ProgramEnrollmentRow[] })),
    client.items
      .query('Enrollments')
      .eq('studentId', studentId)
      .descending('registrationDate')
      .limit(40)
      .find()
      .catch(() => ({ items: [] as ProgramEnrollmentRow[] })),
  ])

  const byKey = new Map<string, ProgramEnrollmentRow>()
  for (const item of (legacy.items ?? []) as ProgramEnrollmentRow[]) {
    const key = `${String(item.programId || item.programName || '').toLowerCase()}::${studentId}`
    byKey.set(key, {
      ...item,
      enrolledAt: item.enrolledAt || item.registrationDate,
      feePaid: item.feePaid ?? item.paymentAmount,
    })
  }
  // Modern rows win
  for (const item of (modern.items ?? []) as ProgramEnrollmentRow[]) {
    const key = `${String(item.programId || item.programName || '').toLowerCase()}::${studentId}`
    byKey.set(key, item)
  }
  return Array.from(byKey.values()).sort((a, b) =>
    String(b.enrolledAt ?? '').localeCompare(String(a.enrolledAt ?? '')),
  )
}

/** Mirror into legacy Enrollments so older portal queries keep working. */
export async function mirrorLegacyEnrollment(row: {
  programId: string
  programName: string
  studentId: string
  studentName: string
  parentEmail: string
  status: string
  feePaid: number
  enrolledAt: string
  transactionId?: string
}) {
  try {
    const client = getWixClient()
    await client.items.insert('Enrollments', {
      programId: row.programId,
      programName: row.programName,
      studentId: row.studentId,
      studentName: row.studentName,
      parentEmail: row.parentEmail,
      status: row.status,
      registrationDate: row.enrolledAt,
      paymentAmount: row.feePaid,
      transactionId: row.transactionId ?? '',
    })
  } catch (err) {
    console.warn('[enrollments] legacy Enrollments mirror failed', err)
  }
}
