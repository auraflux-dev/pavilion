/**
 * StaffProjects — calendar-year work owned by a lead (president / VP).
 * Tasks live under projects and can be assigned to specific staff members.
 */

export const PROJECT_STATUSES = ['active', 'done', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export type StaffProject = {
  id: string
  title: string
  description: string
  schoolYear: string
  leadEmail: string
  leadName: string
  leadRole: string
  memberEmails: string[]
  status: ProjectStatus
  sortOrder: number
  createdByEmail: string
  createdAt: string
  updatedAt: string
  active: boolean
}

export type StaffDirectoryPerson = {
  email: string
  name: string
  boardTitle: string
  roles: string[]
}

/** School year runs July → June (e.g. 2025-2026). */
export function currentSchoolYear(date = new Date()): string {
  const y = date.getFullYear()
  const month = date.getMonth()
  return month >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  const s = String(value ?? '').trim().toLowerCase()
  return (PROJECT_STATUSES as readonly string[]).includes(s) ? (s as ProjectStatus) : 'active'
}

export function parseMemberEmails(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean)),
    )
  }
  return Array.from(
    new Set(
      String(raw ?? '')
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

export function serializeMemberEmails(emails: string[]): string {
  return Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))).join(',')
}

export function isProjectMember(project: StaffProject, email: string): boolean {
  const e = email.trim().toLowerCase()
  if (!e) return false
  if (project.leadEmail === e) return true
  return project.memberEmails.includes(e)
}
