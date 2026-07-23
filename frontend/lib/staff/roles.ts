/**
 * Staff system roles — separate from public BoardMembers display titles.
 * Assigned in CMS collection StaffRoles (email + comma-separated roles).
 */
import { getWixClient } from '@/lib/wix-client'

export const STAFF_ROLES = [
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
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

/**
 * Staff tools require an official PTO login. Board members use their
 * personal email for the parent portal (students, store cards) and their
 * @shmspto.org email for /staff.
 */
export const STAFF_EMAIL_DOMAIN = 'shmspto.org'

export function isStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
}

export type StaffProfile = {
  email: string
  roles: StaffRole[]
  boardTitle: string
  name: string
  /** Plain-text email signature appended to portal replies */
  emailSignature: string
  /** Comma-separated Program CMS ids — scopes instructor/coordinator views */
  assignedProgramIds: string[]
  /** Personal email for parent portal (students, Cove). Not @shmspto.org. */
  personalEmail: string
}

export function normalizePersonalEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Personal parent emails must not use the staff domain. */
export function isValidPersonalEmail(email: string): boolean {
  const value = normalizePersonalEmail(email)
  if (!value || !value.includes('@') || value.startsWith('@')) return false
  if (isStaffEmail(value)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const ROLE_SET = new Set<string>(STAFF_ROLES)

function parseRoles(raw: unknown): StaffRole[] {
  const parts = String(raw ?? '')
    .split(/[,|;]/)
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  const unique = new Set<StaffRole>()
  for (const part of parts) {
    if (ROLE_SET.has(part)) unique.add(part as StaffRole)
  }
  return Array.from(unique)
}

function parseAssignedProgramIds(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[,|;]/)
    .map((id) => id.trim())
    .filter(Boolean)
}

export async function getStaffProfile(email: string): Promise<StaffProfile | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  // Staff roles are only honored on @shmspto.org logins, even if a
  // personal email accidentally has a StaffRoles row.
  if (!isStaffEmail(normalized)) return null

  try {
    const client = getWixClient()
    const result = await client.items
      .query('StaffRoles')
      .eq('email', normalized)
      .eq('active', true)
      .limit(1)
      .find()
    const row = result.items?.[0] as
      | {
          email?: string
          roles?: string
          boardTitle?: string
          name?: string
          emailSignature?: string
          assignedProgramIds?: string
          personalEmail?: string
          active?: boolean
        }
      | undefined
    if (!row) return null
    const roles = parseRoles(row.roles)
    if (!roles.length) return null
    return {
      email: normalized,
      roles,
      boardTitle: String(row.boardTitle ?? ''),
      name: String(row.name ?? ''),
      emailSignature: String(row.emailSignature ?? ''),
      assignedProgramIds: parseAssignedProgramIds(row.assignedProgramIds),
      personalEmail: normalizePersonalEmail(String(row.personalEmail ?? '')),
    }
  } catch {
    return null
  }
}

export function hasStaffRole(profile: StaffProfile | null, role: StaffRole | StaffRole[]) {
  if (!profile) return false
  const needed = Array.isArray(role) ? role : [role]
  if (profile.roles.includes('admin')) return true
  return needed.some((r) => profile.roles.includes(r))
}

/** Full programs catalog (VP Programs / admin) vs scoped instructor/coordinator. */
export function canManageAllPrograms(profile: StaffProfile | null): boolean {
  if (!profile) return false
  if (profile.roles.includes('admin') || profile.roles.includes('programs')) return true
  return false
}

export function scopedProgramIds(profile: StaffProfile | null): string[] | null {
  if (!profile) return []
  if (canManageAllPrograms(profile)) return null // null = no filter
  if (
    profile.roles.includes('instructor') ||
    profile.roles.includes('coordinator')
  ) {
    return profile.assignedProgramIds
  }
  return []
}

export function canAccessProgram(profile: StaffProfile | null, programId: string): boolean {
  const scope = scopedProgramIds(profile)
  if (scope === null) return true
  return scope.includes(programId)
}

export const ROLE_HOME_COPY: Record<
  StaffRole,
  { title: string; owns: string; thisWeek: string[] }
> = {
  admin: {
    title: 'President / Admin',
    owns: 'Stack health, member support, board training, act-as troubleshooting',
    thisWeek: [
      'Review Needs Reconciliation payments',
      'Lookup / act-as parents who need help',
      'Confirm staff role assignments',
    ],
  },
  marketing: {
    title: 'VP Marketing',
    owns: 'Web messaging, newsletters, FB/IG, surveys, photo privacy',
    thisWeek: [
      'Draft social posts for upcoming events',
      'Check open surveys and response channels',
      'Align promo asks from other VPs',
    ],
  },
  secretary: {
    title: 'Secretary',
    owns: 'Minutes, calendar, legal docs, member comms calendar, talent matching',
    thisWeek: [
      'Publish latest meeting minutes',
      'Review legal page copy',
      'Plan email / WhatsApp / in-app sends',
    ],
  },
  treasurer: {
    title: 'Treasurer',
    owns: 'Funds, AR/AP, reimbursements, insurance, contractors',
    thisWeek: [
      'Reconcile store-card and membership payments',
      'Clear reimbursement queue',
      'Check insurance renewals',
    ],
  },
  events: {
    title: 'Co-VP Events',
    owns: 'Events, accessibility, micro-tasks, staff appreciation partnership',
    thisWeek: [
      'Confirm volunteer fill % for next event',
      'Break event into 30-minute tasks',
      'Hand assets to Marketing',
    ],
  },
  programs: {
    title: 'Fundraising & Programs',
    owns: 'Enrichment programs, sponsors, enrollee messaging',
    thisWeek: [
      'Message parents for active enrollments',
      'Check seats / waitlists',
      'Update sponsor pipeline',
    ],
  },
  retail: {
    title: 'Digital & Retail Sales',
    owns: 'Spirit wear, inventory, pop-ups, e-com drops',
    thisWeek: [
      'Review low-stock products',
      'Create or issue discount codes for members',
      'Schedule next spirit drop with Marketing',
    ],
  },
  membership: {
    title: 'Membership Experience',
    owns: 'Roster, onboarding, upgrades, retention, parent outreach',
    thisWeek: [
      'Review free vs paid roster and missing phones',
      'Send welcome / upgrade touch via portal or email',
      'Post Middle School 101 note in grade WhatsApp groups',
    ],
  },
  wellness: {
    title: 'Teacher & Staff Wellness',
    owns: 'Staff appreciation, classroom needs, morale',
    thisWeek: [
      'Update classroom wish list',
      'Plan next staff treat with Events',
      'Confirm budget with Treasurer',
    ],
  },
  instructor: {
    title: 'Program Instructor',
    owns: 'Your assigned classes — roster, sessions, parent messages, timesheets',
    thisWeek: [
      'Submit timesheet hours to VP Programs',
      'Send session reminders to your class',
      'If paid as a contractor, send a completed W-9 to treasurer@shmspto.org',
    ],
  },
  coordinator: {
    title: 'Class Coordinator',
    owns: 'Parent liaison for assigned programs (roster + messaging + hours)',
    thisWeek: [
      'Confirm roster and waitlist with instructor',
      'Submit coordinator hours if contracted',
      'If paid as a contractor, send a completed W-9 to treasurer@shmspto.org',
    ],
  },
}
