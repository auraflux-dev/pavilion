/**
 * Staff system roles. separate from public BoardMembers display titles.
 * Assigned in CMS collection StaffRoles (email + comma-separated roles).
 */
import { getWixClient } from '@/lib/wix-client'
import { parseExtraWorkspaces } from '@/lib/staff/permissions'
import type { StaffWorkspace } from '@/lib/audience'
import { isDemoInstance } from '@/lib/demo/instance'

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

/** Only this mailbox may hold the admin role (President). */
export const PRESIDENT_ADMIN_EMAIL = `president@${STAFF_EMAIL_DOMAIN}`

export function isStaffEmail(email: string): boolean {
 return email.trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
}

export function isPresidentAdminEmail(email: string): boolean {
 return email.trim().toLowerCase() === PRESIDENT_ADMIN_EMAIL
}

/**
 * Admin is reserved for president@. Strip it from every other mailbox;
 * ensure president@ always has admin when they have any StaffRoles row.
 */
export function enforceAdminEmailPolicy(email: string, roles: StaffRole[]): StaffRole[] {
 const normalized = email.trim().toLowerCase()
 const withoutAdmin = roles.filter((r) => r !== 'admin')
 if (isPresidentAdminEmail(normalized)) {
   return ['admin', ...withoutAdmin]
 }
 return withoutAdmin
}

export type StaffProfile = {
 email: string
 roles: StaffRole[]
 boardTitle: string
 name: string
 /** Plain-text email signature appended to portal replies */
 emailSignature: string
 /** Comma-separated Program CMS ids. scopes instructor/coordinator views */
 assignedProgramIds: string[]
 /** Personal email for parent portal (students, Cove). Not @shmspto.org. */
 personalEmail: string
 /** Extra workspaces beyond the role presets. */
 extraWorkspaces: StaffWorkspace[]
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

/**
 * Resolve staff profile for the signed-in email.
 * - @shmspto.org → StaffRoles.email
 * - personal Gmail linked on StaffRoles.personalEmail → that board row
 */
type StaffRoleRow = {
  email?: string
  roles?: string
  boardTitle?: string
  name?: string
  emailSignature?: string
  assignedProgramIds?: string
  personalEmail?: string
  extraWorkspaces?: string
  active?: boolean
}

function profileFromRow(row: StaffRoleRow, fallbackEmail: string): StaffProfile | null {
  if (row.active === false) return null
  const staffEmail = String(row.email ?? fallbackEmail).trim().toLowerCase()
  if (!isStaffEmail(staffEmail)) return null
  const roles = enforceAdminEmailPolicy(staffEmail, parseRoles(row.roles))
  const extraWorkspaces = parseExtraWorkspaces(row.extraWorkspaces)
  if (!roles.length && !extraWorkspaces.length) return null
  return {
    email: staffEmail,
    roles,
    boardTitle: String(row.boardTitle ?? ''),
    name: String(row.name ?? ''),
    emailSignature: String(row.emailSignature ?? ''),
    assignedProgramIds: parseAssignedProgramIds(row.assignedProgramIds),
    personalEmail: normalizePersonalEmail(String(row.personalEmail ?? '')),
    extraWorkspaces,
  }
}

/**
 * Resolve staff profile for the signed-in email(s).
 * - @shmspto.org → StaffRoles.email
 * - personal Gmail linked on StaffRoles.personalEmail → that board row
 */
export async function resolveStaffForSession(
  email: string,
  extraEmails: string[] = [],
): Promise<StaffProfile | null> {
  const candidates = [email, ...extraEmails]
    .map((value) => value.trim().toLowerCase())
    .filter((value, i, all) => value.includes('@') && all.indexOf(value) === i)

  for (const candidate of candidates) {
    if (!isStaffEmail(candidate)) continue
    const profile = await getStaffProfile(candidate)
    if (profile) return profile
  }

  try {
    const client = getWixClient()
    const listed = await client.items.query('StaffRoles').limit(100).find()
    const rows = (listed.items ?? []) as StaffRoleRow[]
    for (const candidate of candidates) {
      if (isStaffEmail(candidate)) continue
      const row = rows.find(
        (item) =>
          item.active !== false &&
          normalizePersonalEmail(String(item.personalEmail ?? '')) === candidate,
      )
      if (!row) continue
      const profile = profileFromRow(row, candidate)
      if (profile) return profile
    }
  } catch {
    return null
  }
  return null
}

export async function getStaffProfile(email: string): Promise<StaffProfile | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !isStaffEmail(normalized)) return null

  try {
    const client = getWixClient()
    const result = await client.items.query('StaffRoles').eq('email', normalized).limit(5).find()
    let row = (result.items ?? [])[0] as StaffRoleRow | undefined
    if (!row) {
      const listed = await client.items.query('StaffRoles').limit(100).find()
      row = ((listed.items ?? []) as StaffRoleRow[]).find(
        (item) => String(item.email ?? '').trim().toLowerCase() === normalized,
      )
    }
    if (!row) return null
    return profileFromRow(row, normalized)
  } catch {
    return null
  }
}

export function hasStaffRole(profile: StaffProfile | null, role: StaffRole | StaffRole[]) {
 if (!profile) return false
 const needed = Array.isArray(role) ? role : [role]
 if (profile.roles.includes('admin')) return true
 // Extras are workspace grants only. Do not treat them as whole roles.
 return needed.some((r) => profile.roles.includes(r))
}

/**
 * Full catalog for board/admin.
 * Instructor and coordinator seats stay scoped to StaffRoles.assignedProgramIds.
 */
export function canManageAllPrograms(profile: StaffProfile | null): boolean {
  if (!profile) return false
  if (hasStaffRole(profile, ['admin', 'programs'])) return true
  if (isInstructorStaffOnly(profile.roles)) return false
  return profile.roles.length > 0
}

/** Create/edit instructor and class-coordinator StaffRoles (not other board seats). */
export const INSTRUCTOR_STAFF_ROLES: StaffRole[] = ['instructor', 'coordinator']

export function canManageInstructorStaff(profile: StaffProfile | null): boolean {
  return hasStaffRole(profile, ['admin', 'programs'])
}

export function isInstructorStaffOnly(roles: StaffRole[]): boolean {
  return roles.length > 0 && roles.every((role) => INSTRUCTOR_STAFF_ROLES.includes(role))
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
 owns: 'Stack health, member support, board training, act-as troubleshooting (president@ only)',
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
 'Finish Marketing onboarding on Home (if new)',
 'Fill Comms calendar for the next two weeks',
 'Align promo asks from other VPs',
 ],
 },
 secretary: {
 title: 'Secretary',
 owns: 'Minutes, calendar, legal docs, member comms calendar, talent matching',
 thisWeek: [
 'Finish Secretary onboarding on Home (if new)',
 'Update Comms calendar (parents / school / board)',
 'Publish latest meeting minutes',
 ],
 },
 treasurer: {
 title: 'Treasurer',
 owns: 'Funds, AR/AP, reimbursements, insurance, contractors',
 thisWeek: [
 'Finish Treasurer onboarding on Home (if new)',
 'Review the 2026-27 planning budget (Staff → Budget)',
 'Reconcile store-card and membership payments',
 'Clear reimbursement queue',
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
 title: 'Fundraising & Programs / Initiatives',
 owns: 'Enrichment programs, instructors, sponsors, enrollee messaging',
 thisWeek: [
 'Staff → Access: add instructors and assign their class IDs',
 'Staff → Programs: roster, registration, and nights',
 'Approve instructor timesheets',
 ],
 },
 retail: {
 title: 'Digital & Retail Sales',
 owns: 'Spirit wear, Cove register, inventory, /cove page copy',
 thisWeek: [
 'Review low-stock products',
 'Keep /cove page copy current',
 'Create or issue discount codes for members',
 ],
 },
 membership: {
 title: 'Membership Experience',
 owns: 'Roster, onboarding, upgrades, retention, parent outreach',
 thisWeek: [
 'Review free vs paid roster and missing phones',
 'Send welcome / upgrade touch via portal or email',
 isDemoInstance() ? 'Post a family-night note in grade WhatsApp groups' : 'Post Middle School 101 note in grade WhatsApp groups',
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
 owns: 'Your assigned class: roster, attendance, parent messages, timesheets',
 thisWeek: [
 'Staff → Programs: open your class (Roster tab)',
 'Staff → Messages: email the class from the parent portal inbox',
 'Class night: Attendance tab, then Timesheets after you teach',
 ],
 },
 coordinator: {
 title: 'Class Coordinator',
 owns: 'Parent liaison for assigned programs (roster + messaging + hours)',
 thisWeek: [
 'Staff → Programs: confirm roster and waitlist with the instructor',
 'Staff → Messages: answer parent questions for your class',
 'Submit coordinator hours on Timesheets if contracted',
 ],
 },
}
