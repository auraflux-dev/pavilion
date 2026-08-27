/**
 * Staff home + More menu: group workspaces by job, not a flat dump.
 */
import { type StaffWorkspace } from '@/lib/audience'

export type StaffWorkspaceGroup = {
  id: string
  label: string
  blurb: string
  workspaces: StaffWorkspace[]
}

/** Order matters: Day to day stays near the top of Home and the nav bar. */
export const STAFF_WORKSPACE_GROUPS: StaffWorkspaceGroup[] = [
  {
    id: 'daily',
    label: 'Day to day',
    blurb: 'Mail, calendar, docs, board list, reimbursements.',
    workspaces: ['inbox', 'calendar', 'docs', 'projects', 'expenses'],
  },
  {
    id: 'families',
    label: 'Families',
    blurb: 'Memberships, parent lookup, and portal messages.',
    workspaces: ['membership', 'members', 'messages', 'tiers', 'access'],
  },
  {
    id: 'programs',
    label: 'Programs & events',
    blurb: 'Classes, teaching hours, events, volunteers, sign-up sheets.',
    workspaces: ['programs', 'timesheets', 'events', 'volunteers', 'signups'],
  },
  {
    id: 'money',
    label: 'Money',
    blurb: 'Payments, refunds, budget, discounts, fundraising, reports.',
    workspaces: ['payments', 'budget', 'discounts', 'fundraising', 'reports'],
  },
  {
    id: 'cove',
    label: 'The Cove',
    blurb: 'In-person sales, pickups, and stock.',
    workspaces: ['retail'],
  },
  {
    id: 'comms',
    label: 'Comms & marketing',
    blurb: 'Newsletter, social, Canva, month grid, surveys.',
    workspaces: ['newsletter', 'social', 'canva', 'comms', 'surveys'],
  },
  {
    id: 'site',
    label: 'Website',
    blurb: 'Page copy, settings, board, nav, FAQ, minutes.',
    workspaces: ['content', 'pagetheme', 'site', 'board', 'nav', 'faq', 'wellness', 'minutes'],
  },
  {
    id: 'help',
    label: 'Help',
    blurb: 'How-tos for staff jobs.',
    workspaces: ['help'],
  },
]

export const STAFF_WORKSPACE_BLURB: Partial<Record<StaffWorkspace, string>> = {
  inbox: 'Workspace mail + reply',
  calendar: 'Google Calendar',
  docs: 'Drive Docs to read/edit',
  projects: 'Year board, tasks & calendar',
  members: 'Lookup, act-as, archive',
  access: 'Instructors and @shmspto.org roles',
  social: 'Facebook from Staff',
  surveys: 'Create, share, review, CSV',
  messages: 'Parent portal inbox',
  minutes: 'Publish meeting minutes',
  programs: 'Your class: roster, attendance, nights',
  timesheets: 'Submit or approve teaching hours',
  payments: 'Payments, refunds, and reconciliation',
  budget: 'BoA CSV · Staff sales · Excel',
  events: 'Create, edit, cancel events',
  retail: 'The Cove product lists',
  discounts: 'Named & member discount codes',
  membership: 'Roster, email, WhatsApp groups',
  tiers: 'Tier map & Catalog product IDs',
  content: 'Page heroes & Cove / marketing copy',
  pagetheme: 'Per-page CSS & string overrides (admin + VP Marketing)',
  site: 'Announcement, contact, goals…',
  board: 'Public /board roster',
  nav: 'Top nav & footer links',
  faq: 'Membership & volunteer FAQs',
  volunteers: 'Volunteer opportunity cards',
  fundraising: 'CTAs & fundraising goals',
  wellness: 'Wish list & appreciation',
  comms: 'Month grid · communications & content',
  canva: 'Marketing folder · optional API',
  newsletter: 'Member email & WhatsApp',
  expenses: 'Submit & track reimbursements',
  reports: 'Rollups by focus area',
  help: 'Staff knowledge base',
}

export type StaffNavItem = { id: StaffWorkspace; label: string }

/** Map allowed nav items into focus groups (empty groups dropped). */
export function groupStaffNavItems(items: StaffNavItem[]): {
  group: StaffWorkspaceGroup
  items: StaffNavItem[]
}[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const grouped: { group: StaffWorkspaceGroup; items: StaffNavItem[] }[] = []
  const seen = new Set<StaffWorkspace>()

  for (const group of STAFF_WORKSPACE_GROUPS) {
    const inGroup: StaffNavItem[] = []
    for (const id of group.workspaces) {
      const item = byId.get(id)
      if (!item || id === 'home') continue
      inGroup.push(item)
      seen.add(id)
    }
    if (inGroup.length) grouped.push({ group, items: inGroup })
  }

  // Any workspace not listed in a group still appears (future-proof).
  const leftover = items.filter((i) => i.id !== 'home' && !seen.has(i.id))
  if (leftover.length) {
    grouped.push({
      group: {
        id: 'other',
        label: 'Other',
        blurb: 'Additional workspaces.',
        workspaces: leftover.map((i) => i.id),
      },
      items: leftover,
    })
  }

  return grouped
}
