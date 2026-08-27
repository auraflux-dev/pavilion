/**
 * Enrichment registration access: optional paid-member priority window,
 * then open to all signed-in parents.
 *
 * Pure helpers: `@/lib/programs/registration-access-shared` (client-safe).
 */
import { isPaidTier } from '@/lib/staff/members-roster'
import {
  getRegistrationPhase,
  memberPriorityDeniedMessage,
  memberPriorityUntilIso,
  type ProgramRegistrationFields,
  type RegistrationAccess,
} from '@/lib/programs/registration-access-shared'

export * from '@/lib/programs/registration-access-shared'

export async function parentHasPaidMembership(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  try {
    const { getParentHighestTier } = await import('@/lib/membership-pricing')
    return isPaidTier(await getParentHighestTier(normalized))
  } catch {
    return false
  }
}

/**
 * Gate enroll / pay: registration must be open; during priority window, parent must be paid.
 */
export async function assertCanRegisterForProgram(
  program: ProgramRegistrationFields,
  parentEmail: string,
  now: Date = new Date(),
): Promise<RegistrationAccess> {
  const until = memberPriorityUntilIso(program.memberPriorityUntil)
  const phase = getRegistrationPhase(program, now)

  if (phase === 'closed') {
    return {
      ok: false,
      phase,
      memberPriorityUntil: until,
      error: 'Registration is closed for this program',
    }
  }

  if (phase === 'member_priority') {
    const paid = await parentHasPaidMembership(parentEmail)
    if (!paid) {
      return {
        ok: false,
        phase,
        memberPriorityUntil: until,
        error: memberPriorityDeniedMessage(until),
      }
    }
  }

  return { ok: true, phase, memberPriorityUntil: until }
}
