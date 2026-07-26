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

export type OnboardingStudent = Omit<StudentSafety, '_id'> & {
  id?: string
  _id?: string
  firstName?: string
  lastName?: string
  grade?: string
}

export type ChecklistItemId =
  | 'add_student'
  | 'student_safety'
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

export function incompleteSafetyStudents(students: OnboardingStudent[]): OnboardingStudent[] {
  return students.filter((s) => !isStudentSafetyComplete(s))
}

/**
 * Cove digital card / load money require at least one student with a complete
 * safety profile. Programs already enforce per-student safety at enroll time.
 */
export function coveFeaturesUnlocked(students: OnboardingStudent[]): {
  ok: boolean
  error?: string
} {
  if (students.length === 0) {
    return {
      ok: false,
      error: 'Add a student in the Member Portal, then complete their safety profile to unlock the Cove Digital Card.',
    }
  }
  if (incompleteSafetyStudents(students).length > 0) {
    return {
      ok: false,
      error:
        'Complete each student’s safety profile (parent phone, emergency contact, and pick-up list) to unlock the Cove Digital Card.',
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
  const safetyDone = hasStudent && incomplete.length === 0
  const cove = coveFeaturesUnlocked(students)

  const safetyDetail = !hasStudent
    ? 'After you add a student, add parent phone, emergency contact, and who may pick them up.'
    : incomplete.length === 0
      ? 'Parent phone, emergency contact, and pick-up list are on file for every student.'
      : incomplete.length === 1
        ? `Finish the profile for ${studentDisplayName(incomplete[0])} (phone, emergency contact, pick-up).`
        : `Finish safety profiles for ${incomplete.length} students (phone, emergency contact, pick-up).`

  const items: ChecklistItem[] = [
    {
      id: 'add_student',
      title: 'Add your student(s)',
      detail: hasStudent
        ? `${students.length} student${students.length === 1 ? '' : 's'} on your account.`
 : 'Name and grade. needed for Cove credit, programs, and your family QR.',
      done: hasStudent,
      required: true,
      href: '#portal-students',
      actionLabel: hasStudent ? 'View students' : 'Add a student',
    },
    {
      id: 'student_safety',
      title: 'Complete student safety profile',
      detail: safetyDetail,
      done: safetyDone,
      required: true,
      href: '#portal-students',
      actionLabel: safetyDone ? 'Review profiles' : 'Complete profile',
    },
    {
      id: 'membership_optional',
      title: accountType === 'paid' ? 'Paid membership active' : 'Join Reef, Lagoon, or Tide (optional)',
      detail:
        accountType === 'paid'
          ? 'Thanks for supporting SHMS PTO. Finish the steps above so card credit and perks attach to your students.'
          : 'Membership is optional. Free accounts can still use The Cove after student setup.',
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
