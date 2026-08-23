import type { StaffProfile, StaffRole } from '@/lib/staff/roles'
import { isSyntheticStagingMode } from '@/lib/fixtures/synthetic-mode'

const STAFF_EMAIL_DOMAIN = 'shmspto.org'
const PRESIDENT_ADMIN_EMAIL = `president@${STAFF_EMAIL_DOMAIN}`

function isStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
}

const ALL_STAFF_ROLES: StaffRole[] = [
  'admin',
  'marketing',
  'secretary',
  'treasurer',
  'events',
  'programs',
  'retail',
  'membership',
  'wellness',
  'instructor',
  'coordinator',
]

/** Staging-only staff seats (public board mailboxes, not parent roster). */
const SYNTHETIC_STAFF_BY_EMAIL: Record<string, { name: string; boardTitle: string; roles: StaffRole[] }> = {
  [PRESIDENT_ADMIN_EMAIL]: {
    name: 'President (staging)',
    boardTitle: 'President',
    roles: ALL_STAFF_ROLES,
  },
  [`vp-marketing@${STAFF_EMAIL_DOMAIN}`]: {
    name: 'VP Marketing (staging)',
    boardTitle: 'VP Marketing',
    roles: ['marketing', 'secretary'],
  },
  [`treasurer@${STAFF_EMAIL_DOMAIN}`]: {
    name: 'Treasurer (staging)',
    boardTitle: 'Treasurer',
    roles: ['treasurer', 'secretary'],
  },
  [`secretary@${STAFF_EMAIL_DOMAIN}`]: {
    name: 'Secretary (staging)',
    boardTitle: 'Secretary',
    roles: ['secretary', 'membership'],
  },
  [`vp-membershipexperience@${STAFF_EMAIL_DOMAIN}`]: {
    name: 'VP Membership (staging)',
    boardTitle: 'VP Membership',
    roles: ['membership', 'secretary'],
  },
}

function defaultSyntheticStaff(email: string): StaffProfile {
  const local = email.split('@')[0]?.replace(/\./g, ' ') || 'Staff'
  const title = local
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return {
    email,
    name: `${title} (staging)`,
    boardTitle: title,
    roles: ['secretary'],
    emailSignature: '',
    assignedProgramIds: [],
    personalEmail: '',
    extraWorkspaces: [],
  }
}

export function syntheticStaffProfile(email: string): StaffProfile | null {
  if (!isSyntheticStagingMode()) return null
  const normalized = email.trim().toLowerCase()
  if (!isStaffEmail(normalized)) return null
  const preset = SYNTHETIC_STAFF_BY_EMAIL[normalized]
  if (preset) {
    return {
      email: normalized,
      name: preset.name,
      boardTitle: preset.boardTitle,
      roles: preset.roles,
      emailSignature: '',
      assignedProgramIds: [],
      personalEmail: '',
      extraWorkspaces: [],
    }
  }
  return defaultSyntheticStaff(normalized)
}

export function resolveSyntheticStaffForSession(
  email: string,
  extraEmails: string[] = [],
): StaffProfile | null {
  if (!isSyntheticStagingMode()) return null
  const candidates = [email, ...extraEmails]
    .map((v) => v.trim().toLowerCase())
    .filter((v, i, all) => v.includes('@') && all.indexOf(v) === i)
  for (const candidate of candidates) {
    const profile = syntheticStaffProfile(candidate)
    if (profile) return profile
  }
  return null
}
