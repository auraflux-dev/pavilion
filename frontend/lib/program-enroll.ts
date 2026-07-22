/**
 * Program enrollment — in-app registration (free or paid via Square/PayPal).
 * Dual-writes ProgramEnrollments + legacy Enrollments; enforces capacity/waitlist.
 */
import { getWixClient } from '@/lib/wix-client'
import { getProgramById } from '@/lib/api/programs'
import {
  recordConsentAcknowledgments,
  validateConsentAcks,
  type ConsentAck,
} from '@/lib/checkout-consent'
import {
  ACTIVE_ENROLL_STATUSES,
  WAITLIST_STATUS,
  countSeatsTaken,
  mirrorLegacyEnrollment,
  nextWaitlistPosition,
} from '@/lib/programs/enrollments'

export type StudentSafety = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  parentPhone?: string
  secondaryPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string
  medicalConditions?: string
  medications?: string
  pickupAuthorized?: string
  selfRelease?: boolean
  photoMediaConsent?: boolean | null
  archived?: boolean
}

export function studentSafetyComplete(s: StudentSafety): { ok: true } | { ok: false; error: string } {
  if (!String(s.parentPhone ?? '').trim()) {
    return { ok: false, error: 'Add a parent phone number on the student profile before registering.' }
  }
  if (!String(s.emergencyContact ?? '').trim() || !String(s.emergencyPhone ?? '').trim()) {
    return { ok: false, error: 'Add an emergency contact name and phone on the student profile before registering.' }
  }
  if (!String(s.pickupAuthorized ?? '').trim()) {
    return { ok: false, error: 'Add at least one authorized pick-up person on the student profile before registering.' }
  }
  return { ok: true }
}

export async function getOwnedStudent(
  parentEmail: string,
  studentId: string,
): Promise<StudentSafety | null> {
  const client = getWixClient()
  const found = await client.items.query('Students').eq('_id', studentId).limit(1).find()
  const row = (found.items?.[0] as StudentSafety | undefined) ?? null
  if (!row || row.archived === true) return null
  if ((row.parentEmail ?? '').toLowerCase() !== parentEmail.toLowerCase()) return null
  return row
}

export async function findExistingEnrollment(programId: string, studentId: string) {
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('programId', programId)
    .eq('studentId', studentId)
    .limit(5)
    .find()
  return (found.items ?? []).find((item) => {
    const status = String((item as { status?: string }).status ?? '')
    return ACTIVE_ENROLL_STATUSES.has(status) || status === WAITLIST_STATUS
  }) as Record<string, unknown> | undefined
}

export async function enrollInProgram(opts: {
  parentEmail: string
  programId: string
  studentId: string
  consents: ConsentAck[]
  transactionId?: string
  feePaid?: number
  /** When true, allow Waitlisted even if payment was collected (rare). */
  allowWaitlist?: boolean
}): Promise<{
  enrollmentId: string
  programName: string
  fee: number
  status: string
  waitlistPosition?: number
  alreadyEnrolled?: boolean
}> {
  const program = await getProgramById(opts.programId)
  if (!program) throw new Error('Program not found')
  if (!program.registrationOpen) throw new Error('Registration is closed for this program')

  const student = await getOwnedStudent(opts.parentEmail, opts.studentId)
  if (!student) throw new Error('Student not found')

  const safety = studentSafetyComplete(student)
  if (!safety.ok) throw new Error(safety.error)

  const consentCheck = validateConsentAcks('program', opts.consents)
  if (!consentCheck.ok) throw new Error(consentCheck.error)

  const existing = await findExistingEnrollment(opts.programId, opts.studentId)
  if (existing) {
    const status = String(existing.status ?? '')
    return {
      enrollmentId: String(existing._id),
      programName: program.name,
      fee: program.fee ?? 0,
      status,
      waitlistPosition:
        status === WAITLIST_STATUS ? Number(existing.waitlistPosition ?? 0) || undefined : undefined,
      alreadyEnrolled: true,
    }
  }

  const fee = Number(program.fee ?? 0)
  if (fee > 0 && !opts.transactionId) {
    throw new Error('Payment required for this program')
  }

  const capacity = Number(program.capacity ?? 0) || 0
  const seatsTaken = capacity > 0 ? await countSeatsTaken(opts.programId) : 0
  const atCapacity = capacity > 0 && seatsTaken >= capacity

  // Paid checkout already charged — still enroll if capacity opened between quote and pay.
  // If still full, waitlist (staff can refund / promote).
  let status = fee > 0 ? 'Paid' : 'Enrolled'
  let waitlistPosition: number | undefined
  if (atCapacity) {
    status = WAITLIST_STATUS
    waitlistPosition = await nextWaitlistPosition(opts.programId)
  }

  const photoAck = consentCheck.acks.find((a) => a.id === 'photo-release')
  const client = getWixClient()
  const now = new Date().toISOString()
  const studentName = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
  const parentEmail = opts.parentEmail.trim().toLowerCase()
  const feePaid = opts.feePaid ?? (fee > 0 ? fee : 0)

  const inserted = await client.items.insert('ProgramEnrollments', {
    programId: opts.programId,
    programName: program.name,
    studentId: opts.studentId,
    studentName,
    parentEmail,
    status,
    feePaid,
    transactionId: opts.transactionId ?? '',
    photoMediaConsent: photoAck ? photoAck.accepted : null,
    enrolledAt: now,
    waitlistPosition: waitlistPosition ?? null,
  })

  const enrollmentId = String((inserted as { _id?: string })._id ?? '')

  await mirrorLegacyEnrollment({
    programId: opts.programId,
    programName: program.name,
    studentId: opts.studentId,
    studentName,
    parentEmail,
    status,
    feePaid,
    enrolledAt: now,
    transactionId: opts.transactionId,
  })

  await recordConsentAcknowledgments({
    parentEmail: opts.parentEmail,
    kind: 'program',
    transactionId: opts.transactionId || `enroll-${enrollmentId}`,
    studentId: opts.studentId,
    programId: opts.programId,
    acks: consentCheck.acks,
  })

  if (photoAck) {
    await client.items.update('Students', {
      ...student,
      _id: opts.studentId,
      photoMediaConsent: photoAck.accepted,
    } as never)
  }

  return {
    enrollmentId,
    programName: program.name,
    fee,
    status,
    waitlistPosition,
  }
}
