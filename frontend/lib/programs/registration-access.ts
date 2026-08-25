/**
 * Enrichment registration access: optional paid-member priority window,
 * then open to all signed-in parents.
 *
 * When Programs.memberPriorityUntil is set and now is before that instant,
 * only paid members (Reef / Lagoon / Tide / faculty / other non-free tiers) may enroll.
 * Empty / past until = general open (same as today whenever registrationOpen).
 */
import { isPaidTier } from '@/lib/staff/members-roster'

export type RegistrationPhase = 'closed' | 'member_priority' | 'open'

export type ProgramRegistrationFields = {
  registrationOpen: boolean
  memberPriorityUntil?: string | null
}

export type RegistrationAccess = {
  ok: boolean
  phase: RegistrationPhase
  memberPriorityUntil: string | null
  error?: string
}

/** Normalize CMS date / datetime / ISO into a comparable Date, or null if unset/invalid. */
export function parseMemberPriorityUntil(raw: unknown): Date | null {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw
  }
  const s = String(raw).trim()
  if (!s) return null
  // Date-only YYYY-MM-DD → end of that calendar day UTC (staff date pickers)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T23:59:59.999Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function memberPriorityUntilIso(raw: unknown): string | null {
  const d = parseMemberPriorityUntil(raw)
  return d ? d.toISOString() : null
}

export function isMemberPriorityWindowActive(
  until: unknown,
  now: Date = new Date(),
): boolean {
  const end = parseMemberPriorityUntil(until)
  if (!end) return false
  return now.getTime() < end.getTime()
}

export function getRegistrationPhase(
  program: ProgramRegistrationFields,
  now: Date = new Date(),
): RegistrationPhase {
  if (!program.registrationOpen) return 'closed'
  if (isMemberPriorityWindowActive(program.memberPriorityUntil, now)) {
    return 'member_priority'
  }
  return 'open'
}

export function formatMemberPriorityUntil(until: unknown): string {
  const d = parseMemberPriorityUntil(until)
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(d)
  } catch {
    return d.toISOString()
  }
}

/** Staff datetime-local → ISO for CMS storage. Empty clears the window. */
export function normalizeMemberPriorityUntilInput(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const d = parseMemberPriorityUntil(s)
  return d ? d.toISOString() : null
}

/** For datetime-local value= (local wall clock, no Z). */
export function toDatetimeLocalValue(until: unknown): string {
  const d = parseMemberPriorityUntil(until)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

export function memberPriorityDeniedMessage(until: unknown): string {
  const when = formatMemberPriorityUntil(until)
  return when
    ? `Registration is open to paid PTO members only until ${when}. Upgrade to Reef, Lagoon, or Tide, or wait until general registration opens.`
    : 'Registration is open to paid PTO members only right now. Upgrade to Reef, Lagoon, or Tide, or wait until general registration opens.'
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
