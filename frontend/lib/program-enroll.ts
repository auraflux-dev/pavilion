/**
 * Program enrollment — in-app registration (free or paid via Square/PayPal).
 */
import { getWixClient } from '@/lib/wix-client'
import { getProgramById } from '@/lib/api/programs'
import {
  recordConsentAcknowledgments,
  validateConsentAcks,
  type ConsentAck,
} from '@/lib/checkout-consent'

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
  studentId: string
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
    return status === 'Enrolled' || status === 'Paid'
  }) as Record<string, unknown> | undefined
}

export async function enrollInProgram(opts: {
  parentEmail: string
  programId: string
  studentId: string
  consents: ConsentAck[]
  transactionId?: string
  feePaid?: number
}): Promise<{ enrollmentId: string; programName: string; fee: number; alreadyEnrolled?: boolean }> {
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
    return {
      enrollmentId: String(existing._id),
      programName: program.name,
      fee: program.fee ?? 0,
      alreadyEnrolled: true,
    }
  }

  const fee = Number(program.fee ?? 0)
  if (fee > 0 && !opts.transactionId) {
    throw new Error('Payment required for this program')
  }

  const photoAck = consentCheck.acks.find((a) => a.id === 'photo-release')
  const client = getWixClient()
  const now = new Date().toISOString()
  const studentName = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()

  const inserted = await client.items.insert('ProgramEnrollments', {
    programId: opts.programId,
    programName: program.name,
    studentId: opts.studentId,
    studentName,
    parentEmail: opts.parentEmail.trim().toLowerCase(),
    status: fee > 0 ? 'Paid' : 'Enrolled',
    feePaid: opts.feePaid ?? (fee > 0 ? fee : 0),
    transactionId: opts.transactionId ?? '',
    photoMediaConsent: photoAck ? photoAck.accepted : null,
    enrolledAt: now,
  })

  const enrollmentId = String((inserted as { _id?: string })._id ?? '')

  await recordConsentAcknowledgments({
    parentEmail: opts.parentEmail,
    kind: 'program',
    transactionId: opts.transactionId || `enroll-${enrollmentId}`,
    studentId: opts.studentId,
    programId: opts.programId,
    acks: consentCheck.acks,
  })

  // Mirror photo choice onto student profile for staff convenience
  if (photoAck) {
    await client.items.update('Students', {
      ...student,
      _id: opts.studentId,
      photoMediaConsent: photoAck.accepted,
    } as never)
  }

  return { enrollmentId, programName: program.name, fee }
}
