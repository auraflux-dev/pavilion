/**
 * Member portal onboarding checklist. soft reminders + feature locks.
 * Account creation and membership payment stay open; Cove / programs stay locked
 * until required student profile fields are filled.
 */
import { getWixClient } from '@/lib/wix-client'
import {
  studentSafetyComplete,
  type StudentSafety,
} from '@/lib/program-enroll'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

export type OnboardingStudent = Omit<StudentSafety, '_id'> & {
  id?: string
  _id?: string
  firstName?: string
  lastName?: string
  grade?: string
  parentFirstName?: string
  parentLastName?: string
  familyProfileConfirmedAt?: string
}

export type ChecklistItemId =
  | 'add_student'
  | 'student_safety'
  | 'confirm_family'
  | 'membership_optional'

export type ChecklistItem = {
  id: ChecklistItemId
  title: string
  detail: string
  done: boolean
  required: boolean
  href?: string
  actionLabel?: string
}

function studentKey(s: OnboardingStudent): string {
  return String(s.id ?? s._id ?? '')
}

export function studentDisplayName(s: OnboardingStudent): string {
  const name = `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim()
  return name || 'Student'
}

/** Safety fields required for Cove use + program registration. */
export function isStudentSafetyComplete(s: OnboardingStudent): boolean {
  return studentSafetyComplete({
    _id: String(s._id ?? s.id ?? ''),
    parentPhone: s.parentPhone,
    emergencyContact: s.emergencyContact,
    emergencyPhone: s.emergencyPhone,
    pickupAuthorized: s.pickupAuthorized,
  }).ok === true
}

export function isParentNameComplete(s: OnboardingStudent): boolean {
  return (
    Boolean(String(s.parentFirstName ?? '').trim()) &&
    Boolean(String(s.parentLastName ?? '').trim())
  )
}

/** Explicit confirm/update after first login (esp. bulk-imported families). */
export function isFamilyProfileConfirmed(students: OnboardingStudent[]): boolean {
  if (students.length === 0) return false
  return students.every((s) => Boolean(String(s.familyProfileConfirmedAt ?? '').trim()))
}

export function incompleteSafetyStudents(students: OnboardingStudent[]): OnboardingStudent[] {
  return students.filter((s) => !isStudentSafetyComplete(s) || !isParentNameComplete(s))
}

/**
 * Cove digital card / load money require confirmed family details (parent name +
 * safety) on every active student. Programs also enforce per-student safety at enroll.
 */
export function coveFeaturesUnlocked(students: OnboardingStudent[]): {
  ok: boolean
  error?: string
} {
  if (students.length === 0) {
    return {
      ok: false,
      error:
        vanillaizeIfDemo(
          'Add a student in the Member Portal, then confirm your family details to unlock the Cove Digital Card.',
        ),
    }
  }
  if (!isFamilyProfileConfirmed(students) || incompleteSafetyStudents(students).length > 0) {
    return {
      ok: false,
      error:
        vanillaizeIfDemo(
          'Confirm your family details (parent name, phone, emergency contact, and pick-up list) to unlock the Cove Digital Card.',
        ),
    }
  }
  return { ok: true }
}

export function buildOnboardingChecklist(opts: {
  students: OnboardingStudent[]
  accountType: 'free' | 'paid'
}): {
  items: ChecklistItem[]
  requiredDone: number
  requiredTotal: number
  complete: boolean
  coveUnlocked: boolean
} {
  const { students, accountType } = opts
  const hasStudent = students.length > 0
  const incomplete = incompleteSafetyStudents(students)
  const confirmed = isFamilyProfileConfirmed(students)
  const familyDone = hasStudent && confirmed && incomplete.length === 0
  const cove = coveFeaturesUnlocked(students)

  const familyDetail = !hasStudent
    ? 'After you add a student, confirm parent name, phone, emergency contact, and who may pick them up.'
    : familyDone
      ? 'Parent name, phone, emergency contact, and pick-up list are confirmed for your family.'
      : confirmed && incomplete.length > 0
        ? incomplete.length === 1
          ? `Update details for ${studentDisplayName(incomplete[0])} (name, phone, emergency, pick-up).`
          : `Update safety details for ${incomplete.length} students.`
        : hasStudent
          ? vanillaizeIfDemo(
              'We may already have your students from school lists. Confirm or update your details below to unlock Cove.',
            )
          : 'Confirm parent name, phone, emergency contact, and pick-up.'

  const items: ChecklistItem[] = [
    {
      id: 'add_student',
      title: 'Add your student(s)',
      detail: hasStudent
        ? `${students.length} student${students.length === 1 ? '' : 's'} on your account.`
        : vanillaizeIfDemo('Name and grade. needed for Cove credit, programs, and your family QR.'),
      done: hasStudent,
      required: true,
      href: '#portal-students',
      actionLabel: hasStudent ? 'View students' : 'Add a student',
    },
    {
      id: 'confirm_family',
      title: 'Confirm your family details',
      detail: familyDetail,
      done: familyDone,
      required: true,
      href: '#portal-confirm-family',
      actionLabel: familyDone ? 'Review details' : 'Confirm / update',
    },
    {
      id: 'membership_optional',
      title: accountType === 'paid'
        ? 'Paid membership active'
        : vanillaizeIfDemo('Join Reef, Lagoon, or Tide (optional)'),
      detail:
        accountType === 'paid'
          ? vanillaizeIfDemo(
              'Thanks for supporting SHMS PTO. Finish the steps above so card credit and perks attach to your students.',
            )
          : vanillaizeIfDemo(
              'Membership is optional. Free accounts can still use The Cove after student setup.',
            ),
      done: accountType === 'paid',
      required: false,
      href: accountType === 'paid' ? undefined : '/membership',
      actionLabel: accountType === 'paid' ? undefined : 'View membership',
    },
  ]

  const required = items.filter((i) => i.required)
  const requiredDone = required.filter((i) => i.done).length

  return {
    items,
    requiredDone,
    requiredTotal: required.length,
    complete: requiredDone === required.length,
    coveUnlocked: cove.ok,
  }
}

/** Server-side student rows for Cove / onboarding gates. */
export async function loadFamilyOnboardingStudents(
  parentEmail: string,
): Promise<OnboardingStudent[]> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return []
  const client = getWixClient()
  const result = await client.items.query('Students').eq('parentEmail', email).limit(100).find()
    return ((result.items ?? []) as OnboardingStudent[])
    .filter((s) => (s as { archived?: boolean }).archived !== true)
    .map((s) => ({
      ...s,
      _id: String(s._id ?? s.id ?? ''),
      id: String(s.id ?? s._id ?? ''),
      parentFirstName: String(s.parentFirstName ?? ''),
      parentLastName: String(s.parentLastName ?? ''),
      familyProfileConfirmedAt: String(s.familyProfileConfirmedAt ?? ''),
    }))
}

export async function requireCoveUnlocked(parentEmail: string): Promise<
  | { ok: true; students: OnboardingStudent[] }
  | { ok: false; error: string }
> {
  const students = await loadFamilyOnboardingStudents(parentEmail)
  const gate = coveFeaturesUnlocked(students)
  if (!gate.ok) return { ok: false, error: gate.error ?? 'Complete family setup first.' }
  return { ok: true, students }
}
