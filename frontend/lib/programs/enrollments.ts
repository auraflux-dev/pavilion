/**
 * Shared program enrollment helpers — seats, waitlist, dual-write for portal.
 */
import { getWixClient } from '@/lib/wix-client'

export const ACTIVE_ENROLL_STATUSES = new Set(['Enrolled', 'Paid'])
export const WAITLIST_STATUS = 'Waitlisted'
export const SEAT_STATUSES = new Set(['Enrolled', 'Paid']) // count toward capacity
export const REQUEST_STATUSES = new Set(['RefundRequested', 'TransferRequested'])
export const TERMINAL_STATUSES = new Set(['Cancelled', 'Refunded'])
export const ALL_ENROLL_STATUSES = [
  'Enrolled',
  'Paid',
  WAITLIST_STATUS,
  'Cancelled',
  'RefundRequested',
  'Refunded',
  'TransferRequested',
] as const

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
  requestNote?: string
  requestedToProgramId?: string
  requestedToProgramName?: string
  refundNote?: string
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

/** Best-effort status sync on matching legacy Enrollments row. */
export async function updateLegacyEnrollmentStatus(opts: {
  programId: string
  studentId: string
  status: string
  programName?: string
  programIdNext?: string
}) {
  try {
    const client = getWixClient()
    const found = await client.items
      .query('Enrollments')
      .eq('programId', opts.programId)
      .eq('studentId', opts.studentId)
      .limit(5)
      .find()
    const items = found.items ?? []
    for (const item of items) {
      const id = String((item as { _id?: string })._id ?? '')
      if (!id) continue
      await client.items.update('Enrollments', {
        ...(item as Record<string, unknown>),
        _id: id,
        status: opts.status,
        ...(opts.programName ? { programName: opts.programName } : {}),
        ...(opts.programIdNext ? { programId: opts.programIdNext } : {}),
      } as never)
    }
  } catch (err) {
    console.warn('[enrollments] legacy status update failed', err)
  }
}

/** Promote waitlist #1 into a freed seat (Enrolled or Paid matching feePaid). */
export async function promoteFirstWaitlisted(
  programId: string,
): Promise<{ promotedId: string; status: string } | null> {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('programId', programId)
    .eq('status', WAITLIST_STATUS)
    .limit(50)
    .find()
  const rows = ((found.items ?? []) as ProgramEnrollmentRow[]).sort((a, b) => {
    const pa = Number(a.waitlistPosition ?? 9999)
    const pb = Number(b.waitlistPosition ?? 9999)
    if (pa !== pb) return pa - pb
    return String(a.enrolledAt ?? '').localeCompare(String(b.enrolledAt ?? ''))
  })
  const first = rows[0]
  if (!first?._id) return null

  const feePaid = Number(first.feePaid ?? 0)
  const nextStatus = feePaid > 0 ? 'Paid' : 'Enrolled'
  await client.items.update('ProgramEnrollments', {
    ...first,
    _id: first._id,
    status: nextStatus,
    waitlistPosition: null,
  } as never)

  await updateLegacyEnrollmentStatus({
    programId,
    studentId: String(first.studentId ?? ''),
    status: nextStatus,
  })

  return { promotedId: first._id, status: nextStatus }
}

