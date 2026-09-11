/**
 * AuraFlux Staff surfaces .  Brand Staff + lean customer Staff.
 *
 * Brand Staff (company /staff, @auraflux.co) is AuraFlux home base.
 * Unlike Business Rocket, the AuraFlux brand host also serves full /member-portal.
 *
 * Customer Staff (on their host) is trimmed: website + portal users + messages.
 */
import type { StaffWorkspace } from '@/lib/audience'
import type { PlatformWorkspace, PlatformWorkspaceGroup } from '@/lib/staff/platform-workspaces'
import type { StaffWorkspaceGroup } from '@/lib/staff/workspace-groups'

/** School/PTO workspaces hidden on every AF product Staff surface. */
export const AF_PTO_FAT_WORKSPACES: StaffWorkspace[] = [
  'programs',
  'timesheets',
  'volunteers',
  'signups',
  'wellness',
  'membership',
  'tiers',
  'community',
  'fundraising',
  'retail',
  'discounts',
  'minutes',
  'board',
  'faq',
  'budget',
  'expenses',
  'surveys',
]

/**
 * Customer Staff allowlist .  what a AF client’s own Staff needs after launch.
 * Brand Staff warping into that org uses the same lean catalog.
 */
export const AF_CUSTOMER_STAFF_ALLOWLIST: StaffWorkspace[] = [
  'home',
  'brand',
  'pages',
  'content',
  'pagetheme',
  'site',
  'nav',
  'messages',
  'help',
  'access',
  'members',
  'activity',
  'modules',
  'inbox',
  'calendar',
  'docs',
  'projects',
  'events',
  'newsletter',
  'social',
  'canva',
  'comms',
  'payments',
  'reports',
]

const AF_ALLOW = new Set<StaffWorkspace>(AF_CUSTOMER_STAFF_ALLOWLIST)
const AF_FAT = new Set<StaffWorkspace>(AF_PTO_FAT_WORKSPACES)

export function isAfStaffWorkspaceAllowed(id: StaffWorkspace): boolean {
  if (AF_FAT.has(id)) return false
  return AF_ALLOW.has(id)
}

export function filterAfCustomerStaffWorkspaces(ids: StaffWorkspace[]): StaffWorkspace[] {
  return ids.filter((id) => isAfStaffWorkspaceAllowed(id))
}

export const AF_STAFF_WORKSPACE_LABEL: Partial<Record<StaffWorkspace, string>> = {
  messages: 'Client messages',
  members: 'Portal users',
  access: 'Staff accounts',
  brand: 'Brand',
  pages: 'Pages',
  content: 'Page copy',
  site: 'Site settings',
  nav: 'Nav & footer',
  modules: 'Modules',
  projects: 'Projects',
  events: 'Events',
  payments: 'Payments',
  newsletter: 'Newsletter',
  social: 'Social',
  canva: 'Canva',
  comms: 'Comms plan',
  help: 'Help',
  activity: 'Activity',
}

export function afStaffWorkspaceLabel(id: StaffWorkspace, fallback: string): string {
  return AF_STAFF_WORKSPACE_LABEL[id] || fallback
}

export const AF_STAFF_WORKSPACE_GROUPS: StaffWorkspaceGroup[] = [
  {
    id: 'website',
    label: 'Website',
    blurb: 'Their marketing site .  brand, pages, settings.',
    workspaces: ['brand', 'pages', 'content', 'pagetheme', 'site', 'nav', 'modules'],
  },
  {
    id: 'clients',
    label: 'Portal & team',
    blurb: 'Client portal users, their Staff accounts, messages to AF.',
    workspaces: ['messages', 'members', 'access', 'activity'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    blurb: 'Mail, calendar, docs, delivery projects.',
    workspaces: ['inbox', 'calendar', 'docs', 'projects', 'events'],
  },
  {
    id: 'marketing',
    label: 'Marketing (add-on)',
    blurb: 'Only when they buy marketing services.',
    workspaces: ['newsletter', 'social', 'canva', 'comms'],
  },
  {
    id: 'billing',
    label: 'Billing',
    blurb: 'Payments when connected.',
    workspaces: ['payments', 'reports'],
  },
  {
    id: 'help',
    label: 'Help',
    blurb: 'How this Staff portal works.',
    workspaces: ['help'],
  },
]

/**
 * Brand Staff fleet .  home base to grow AF, launch clients, support them.
 */
export const AF_PLATFORM_WORKSPACE_GROUPS: PlatformWorkspaceGroup[] = [
  {
    id: 'grow',
    label: 'Grow & launch',
    blurb: 'Win customers, provision builds, get them live.',
    workspaces: ['tenants', 'onboarding', 'modules'],
  },
  {
    id: 'serve',
    label: 'Serve',
    blurb: 'Help when something breaks or they need a hand in their portals.',
    workspaces: ['support', 'tenants'],
  },
  {
    id: 'ops',
    label: 'Ops',
    blurb: 'Fleet health and deploy checks.',
    workspaces: ['health'],
  },
  {
    id: 'help',
    label: 'Help',
    blurb: 'How Brand Staff works.',
    workspaces: ['help'],
  },
]

export const AF_PLATFORM_WORKSPACE_LABEL: Record<PlatformWorkspace, string> = {
  home: 'Home',
  tenants: 'Customers',
  tenant: 'Customer',
  modules: 'Modules',
  onboarding: 'Launch',
  support: 'Support',
  blog: 'Blog',
  health: 'Health',
  help: 'Help',
}

export const AF_PLATFORM_WORKSPACE_BLURB: Partial<Record<PlatformWorkspace, string>> = {
  tenants: 'Every client build .  site, portal, Staff. Warp in anytime.',
  tenant: 'One client: host, modules, brand, activity, warp',
  modules: 'What this client gets from us',
  onboarding: 'Sale → provision → launch checklist',
  support: 'Help queue across customers',
  health: 'Deploy and connector health',
  help: 'Brand Staff playbook',
}

export const AF_BRAND_STAFF_HOME_COPY = `Brand Staff is AuraFlux’s home base.

Grow the customer base, launch each client’s site + portal + Staff, and stay ready to help when something breaks or they need you inside their portals.

After launch: open any customer, see activity, and manage what they get from us.`