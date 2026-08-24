/**
 * Staff access: roles are presets. Extra workspaces are individual permissions
 * you can add without granting a whole extra role.
 */
import { STAFF_WORKSPACE_LABEL, type StaffWorkspace } from '@/lib/audience'
import { COMMONS_DEMO_HIDDEN_WORKSPACES } from '@/lib/demo/commons-surface'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance, isPublicDemoInstance } from '@/lib/demo/instance'
import type { StaffRole } from '@/lib/staff/roles'

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  events: 'Events',
  programs: 'Programs / Initiatives',
  retail: isDemoInstance() ? `${DEMO_BRAND.store} / retail` : 'Cove / retail',
  membership: 'Membership',
  wellness: 'Wellness',
  instructor: 'Instructor',
  coordinator: 'Coordinator',
}

/** Already on for anyone with staff access. */
export const STAFF_BASE_WORKSPACES: StaffWorkspace[] = [
  'home',
  'inbox',
  'calendar',
  'docs',
  'projects',
  'expenses',
  'help',
]

/** Admin-only. Not assignable as extras. */
export const STAFF_ADMIN_WORKSPACES: StaffWorkspace[] = ['members', 'access']

export const STAFF_PERMISSION_GROUPS: { id: string; label: string; items: StaffWorkspace[] }[] = [
  {
    id: 'people',
    label: 'People',
    items: ['members', 'access', 'membership', 'tiers', 'messages', 'surveys'],
  },
  {
    id: 'programs',
    label: 'Programs & events',
    items: ['programs', 'timesheets', 'events', 'volunteers', 'wellness'],
  },
  {
    id: 'money',
    label: 'Money',
    items: ['payments', 'budget', 'retail', 'discounts', 'fundraising'],
  },
  {
    id: 'site',
    label: 'Site & comms',
    items: [
      'content',
      'pagetheme',
      'site',
      'board',
      'nav',
      'faq',
      'social',
      'newsletter',
      'comms',
      'canva',
      'minutes',
    ],
  },
  {
    id: 'tools',
    label: 'Everyday',
    items: ['home', 'inbox', 'calendar', 'docs', 'projects', 'expenses', 'reports', 'help'],
  },
]

const ALL_ROLES: StaffRole[] = [
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

/**
 * Roles that include this workspace (matches the Staff dashboard).
 * First non-admin entry is the primary role used when someone is granted
 * this workspace as an extra permission.
 */
export const WORKSPACE_ROLES: Record<StaffWorkspace, StaffRole[]> = {
  home: ALL_ROLES,
  inbox: ALL_ROLES,
  calendar: ALL_ROLES,
  docs: ALL_ROLES,
  projects: ALL_ROLES,
  expenses: ALL_ROLES,
  help: ALL_ROLES,
  members: ['admin'],
  access: ['admin', 'programs'],
  social: ['marketing', 'admin'],
  canva: ['marketing', 'admin'],
  surveys: ['marketing', 'secretary', 'wellness', 'admin'],
  messages: ['membership', 'secretary', 'programs', 'instructor', 'coordinator', 'admin'],
  minutes: ['secretary', 'admin'],
  programs: ['programs', 'instructor', 'coordinator', 'admin'],
  timesheets: ['programs', 'instructor', 'coordinator', 'admin'],
  payments: ['treasurer', 'admin'],
  budget: ['treasurer', 'admin'],
  events: ['events', 'secretary', 'marketing', 'admin'],
  retail: ['retail', 'admin'],
  discounts: ['retail', 'membership', 'admin'],
  membership: ['membership', 'secretary', 'admin'],
  tiers: ['membership', 'secretary', 'admin'],
  content: ['marketing', 'secretary', 'retail', 'admin'],
  pagetheme: ['marketing', 'admin'],
  site: [
    'marketing',
    'secretary',
    'membership',
    'programs',
    'treasurer',
    'events',
    'retail',
    'wellness',
    'admin',
  ],
  board: ['secretary', 'admin'],
  nav: ['marketing', 'secretary', 'admin'],
  faq: ['marketing', 'membership', 'secretary', 'admin'],
  volunteers: ['events', 'secretary', 'admin'],
  fundraising: ['treasurer', 'programs', 'marketing', 'admin'],
  wellness: ['wellness', 'events', 'admin'],
  newsletter: ['marketing', 'secretary', 'membership', 'admin'],
  comms: ['marketing', 'secretary', 'membership', 'events', 'admin'],
  reports: ['programs', 'retail', 'treasurer', 'membership', 'events', 'admin'],
}

const ASSIGNABLE = new Set<string>(
  STAFF_PERMISSION_GROUPS.flatMap((g) => g.items).filter(
    (id) => !STAFF_ADMIN_WORKSPACES.includes(id) && !STAFF_BASE_WORKSPACES.includes(id),
  ),
)

export function workspaceLabel(id: StaffWorkspace): string {
  return STAFF_WORKSPACE_LABEL[id]
}

export function parseExtraWorkspaces(raw: unknown): StaffWorkspace[] {
  const parts = String(raw ?? '')
    .split(/[,|;]/)
    .map((v) => v.trim())
    .filter(Boolean)
  const unique = new Set<StaffWorkspace>()
  for (const part of parts) {
    if (ASSIGNABLE.has(part)) unique.add(part as StaffWorkspace)
  }
  return Array.from(unique)
}

export function workspacesFromRoles(roles: string[]): Set<StaffWorkspace> {
  const set = new Set<StaffWorkspace>()
  if (roles.includes('admin')) {
    for (const id of Object.keys(WORKSPACE_ROLES) as StaffWorkspace[]) set.add(id)
    return set
  }
  for (const [ws, owners] of Object.entries(WORKSPACE_ROLES) as [StaffWorkspace, StaffRole[]][]) {
    if (owners.some((r) => roles.includes(r))) set.add(ws)
  }
  return set
}

export function primaryRoleForWorkspace(workspace: StaffWorkspace): StaffRole | null {
  return WORKSPACE_ROLES[workspace].find((r) => r !== 'admin') ?? null
}

export function rolesThatInclude(workspace: StaffWorkspace): StaffRole[] {
  return WORKSPACE_ROLES[workspace].filter((r) => r !== 'admin')
}

export function extrasBeyondRoles(
  roles: string[],
  selected: StaffWorkspace[],
): StaffWorkspace[] {
  const implied = workspacesFromRoles(roles)
  return selected.filter((ws) => ASSIGNABLE.has(ws) && !implied.has(ws))
}

export function effectiveStaffRoles(
  roles: string[],
  extraWorkspaces: string[] = [],
): StaffRole[] {
  const set = new Set<StaffRole>()
  for (const role of roles) {
    if (role in STAFF_ROLE_LABEL) set.add(role as StaffRole)
  }
  if (set.has('admin')) return [...ALL_ROLES]
  for (const ws of extraWorkspaces) {
    if (!ASSIGNABLE.has(ws)) continue
    const primary = primaryRoleForWorkspace(ws as StaffWorkspace)
    if (primary) set.add(primary)
  }
  return Array.from(set)
}

export function staffCanWorkspace(
  staff: { roles: string[]; extraWorkspaces?: string[] } | null,
  workspace: StaffWorkspace,
): boolean {
  if (!staff) return false
  if (
    (isDemoInstance() || isPublicDemoInstance()) &&
    COMMONS_DEMO_HIDDEN_WORKSPACES.includes(workspace)
  ) {
    return false
  }
  if (staff.roles.includes('admin')) return true
  const extras = staff.extraWorkspaces ?? []
  if (extras.includes(workspace)) return true
  if (STAFF_BASE_WORKSPACES.includes(workspace)) {
    return staff.roles.length > 0 || extras.length > 0
  }
  return WORKSPACE_ROLES[workspace].some((r) => staff.roles.includes(r))
}
