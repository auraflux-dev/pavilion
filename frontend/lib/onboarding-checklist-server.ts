/** Server-only Cove / onboarding loaders (household account numbers). */
import 'server-only'

import {
  coveFeaturesUnlocked,
  type OnboardingStudent,
} from '@/lib/onboarding-checklist'

/** Student rows for Cove / onboarding gates (account-number household). */
export async function loadFamilyOnboardingStudents(
  parentEmail: string,
): Promise<OnboardingStudent[]> {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return []
  const { listFamilyStudents } = await import('@/lib/family-store-card')
  const rows = await listFamilyStudents(email)
  return (rows as OnboardingStudent[]).map((s) => ({
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
