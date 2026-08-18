/**
 * First-login / role onboarding checklists for board staff roles.
 * Progress is stored on StaffRoles.onboardingProgress (JSON map of stepId → ISO).
 * president@ skips onboarding (see onboardingRolesFor / shouldShowStaffOnboarding).
 */
import type { StaffRole } from '@/lib/staff/roles'
import { isPresidentAdminEmail, PRESIDENT_ADMIN_EMAIL } from '@/lib/staff/roles'
import type { StaffWorkspace } from '@/lib/audience'

export const PRESIDENT_STAFF_EMAIL = PRESIDENT_ADMIN_EMAIL

export const STAFF_ONBOARDING_ROLES = [
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

export type StaffOnboardingRole = (typeof STAFF_ONBOARDING_ROLES)[number]

export type StaffOnboardingStep = {
  id: string
  title: string
  detail: string
  /** Deep-link into a Staff workspace when possible. */
  workspace?: StaffWorkspace
  /** External systems still used outside Staff. */
  externalHref?: string
  actionLabel: string
  /** Auto-complete from profile when true. */
  autoKey?: 'personalEmail' | 'googleConnected'
}

export type StaffOnboardingTrack = {
  role: StaffOnboardingRole
  title: string
  summary: string
  steps: StaffOnboardingStep[]
}

const sharedStart = (prefix: string): StaffOnboardingStep[] => [
  {
    id: `${prefix}_google`,
    title: 'Connect Google Workspace',
    detail: 'Inbox, Calendar, and Docs for your @shmspto.org account.',
    workspace: 'inbox',
    actionLabel: 'Open Inbox',
    autoKey: 'googleConnected',
  },
  {
    id: `${prefix}_personal_email`,
    title: 'Save personal email on Home',
    detail: 'Parent portal (students / Cove) uses personal Gmail — not @shmspto.org.',
    workspace: 'home',
    actionLabel: 'Go to Home',
    autoKey: 'personalEmail',
  },
  {
    id: `${prefix}_projects`,
    title: 'Open Projects board',
    detail: 'See year swimlanes and any tasks assigned to you.',
    workspace: 'projects',
    actionLabel: 'Open Projects',
  },
]

const sharedEnd = (prefix: string): StaffOnboardingStep[] => [
  {
    id: `${prefix}_help`,
    title: 'Skim Staff Help',
    detail: 'In-app KB plus Drive how-tos for your role.',
    workspace: 'help',
    actionLabel: 'Open Help',
  },
]

export const STAFF_ONBOARDING_TRACKS: Record<StaffOnboardingRole, StaffOnboardingTrack> = {
  marketing: {
    role: 'marketing',
    title: 'VP Marketing onboarding',
    summary:
      'Connect Google, learn the content calendar, Canva folder, social, newsletter, and site copy.',
    steps: [
      ...sharedStart('mkt'),
      {
        id: 'mkt_comms',
        title: 'Open Comms & content calendar',
        detail: 'Plan the next two weeks: Communications + Content planner month grid.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      {
        id: 'mkt_canva',
        title: 'Open the Marketing Canva folder',
        detail:
          'Staff → Canva → Open Marketing folder. Work only in that PTO folder (not personal Canva).',
        workspace: 'canva',
        actionLabel: 'Open Canva',
      },
      {
        id: 'mkt_social',
        title: 'Tour Social (Facebook / Instagram)',
        detail: 'Compose or schedule posts from Staff. Link back to shmspto.org.',
        workspace: 'social',
        actionLabel: 'Open Social',
      },
      {
        id: 'mkt_newsletter',
        title: 'Tour Newsletter & WhatsApp',
        detail: 'Member email blasts and grade WhatsApp queue live here.',
        workspace: 'newsletter',
        actionLabel: 'Open Newsletter',
      },
      {
        id: 'mkt_page_copy',
        title: 'Review Page copy & site settings',
        detail: 'Heroes, announcement bar, and public marketing CTAs.',
        workspace: 'content',
        actionLabel: 'Open Page copy',
      },
      {
        id: 'mkt_surveys',
        title: 'Know Surveys + photo privacy',
        detail: 'Create/share surveys; keep photo release rules in mind for social.',
        workspace: 'surveys',
        actionLabel: 'Open Surveys',
      },
      ...sharedEnd('mkt'),
    ],
  },
  secretary: {
    role: 'secretary',
    title: 'Secretary onboarding',
    summary:
      'Own minutes, the member/school/board comms calendar, board roster, and legal surfaces.',
    steps: [
      ...sharedStart('sec'),
      {
        id: 'sec_minutes',
        title: 'Open Minutes workspace',
        detail: 'Publish or confirm the latest meeting minutes are current.',
        workspace: 'minutes',
        actionLabel: 'Open Minutes',
      },
      {
        id: 'sec_comms',
        title: 'Set up Comms & content calendar',
        detail: 'Track parent, school, and board messages on the month grid.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      {
        id: 'sec_board',
        title: 'Review Board roster',
        detail: 'Public /board names and titles stay accurate in Staff.',
        workspace: 'board',
        actionLabel: 'Open Board roster',
      },
      {
        id: 'sec_events',
        title: 'Know Events + portal calendar',
        detail: 'Partner with Events VP; portal calendar events can be staff-authored.',
        workspace: 'events',
        actionLabel: 'Open Events',
      },
      {
        id: 'sec_newsletter',
        title: 'Tour Newsletter / WhatsApp',
        detail: 'Member sends and grade WhatsApp queue — often co-owned with Marketing.',
        workspace: 'newsletter',
        actionLabel: 'Open Newsletter',
      },
      ...sharedEnd('sec'),
    ],
  },
  treasurer: {
    role: 'treasurer',
    title: 'Treasurer onboarding',
    summary:
      'Keep the 2026–27 planning budget, reconcile payments, clear expenses, and leave MoneyMinder / Square / bank as books of record.',
    steps: [
      ...sharedStart('tre'),
      {
        id: 'tre_budget',
        title: 'Open the 2026–27 planning budget',
        detail: '2026–27 is Jul 1–Jun 30. Expense budgets start from FY25 checking. Import a Bank of America CSV. Square/PayPal payouts already settle in checking. Not the ledger.',
        workspace: 'budget',
        actionLabel: 'Open Budget',
      },
      {
        id: 'tre_payments',
        title: 'Open Payments · Needs Reconciliation',
        detail: 'Clear store-card / membership rows that need attention.',
        workspace: 'payments',
        actionLabel: 'Open Payments',
      },
      {
        id: 'tre_expenses',
        title: 'Review Expenses / reimbursements',
        detail: 'Approve or pay staff reimbursement requests.',
        workspace: 'expenses',
        actionLabel: 'Open Expenses',
      },
      {
        id: 'tre_reports',
        title: 'Open Staff Reports',
        detail: 'Operational tables and CSV exports (not the official ledger).',
        workspace: 'reports',
        actionLabel: 'Open Reports',
      },
      {
        id: 'tre_moneyminder',
        title: 'Confirm MoneyMinder access',
        detail: 'Official books stay in MoneyMinder — not duplicated in Staff.',
        externalHref: 'https://www.moneyminder.com/',
        actionLabel: 'Open MoneyMinder',
      },
      {
        id: 'tre_square',
        title: 'Confirm Square Dashboard access',
        detail: 'Membership and Cove card charges settle in Square.',
        externalHref: 'https://squareup.com/dashboard',
        actionLabel: 'Open Square',
      },
      ...sharedEnd('tre'),
    ],
  },
  events: {
    role: 'events',
    title: 'VP Events onboarding',
    summary: 'Run public events, volunteers, and wellness partnerships from Staff.',
    steps: [
      ...sharedStart('evt'),
      {
        id: 'evt_events',
        title: 'Open Events workspace',
        detail: 'Create / edit / cancel events that appear on /events and the portal calendar.',
        workspace: 'events',
        actionLabel: 'Open Events',
      },
      {
        id: 'evt_volunteers',
        title: 'Review Volunteer ops',
        detail: 'Keep volunteer opportunities current for parents.',
        workspace: 'volunteers',
        actionLabel: 'Open Volunteers',
      },
      {
        id: 'evt_comms',
        title: 'Add event promos to Comms calendar',
        detail: 'Schedule parent / school / board messages around each event.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      {
        id: 'evt_wellness',
        title: 'Know Wellness partnership',
        detail: 'Teacher appreciation often pairs with Events — skim Wellness tools.',
        workspace: 'wellness',
        actionLabel: 'Open Wellness',
      },
      ...sharedEnd('evt'),
    ],
  },
  programs: {
    role: 'programs',
    title: 'VP Programs onboarding',
    summary: 'Own program registration toggles, sessions, and parent Messages.',
    steps: [
      ...sharedStart('prg'),
      {
        id: 'prg_programs',
        title: 'Open Programs workspace',
        detail: 'Registration toggles and session lists for each program.',
        workspace: 'programs',
        actionLabel: 'Open Programs',
      },
      {
        id: 'prg_messages',
        title: 'Open Messages (parent inbox)',
        detail: 'Reply to program questions from the parent portal.',
        workspace: 'messages',
        actionLabel: 'Open Messages',
      },
      {
        id: 'prg_fundraising',
        title: 'Review Fundraising CTAs',
        detail: 'Public fundraising cards and goal settings when programs fundraise.',
        workspace: 'fundraising',
        actionLabel: 'Open Fundraising',
      },
      {
        id: 'prg_comms',
        title: 'Plan program blasts in Comms',
        detail: 'Registration opens / reminders belong on the Comms calendar.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      ...sharedEnd('prg'),
    ],
  },
  retail: {
    role: 'retail',
    title: 'Retail / Cove onboarding',
    summary: 'Cove register, products, discounts, and public /cove page copy.',
    steps: [
      ...sharedStart('rtl'),
      {
        id: 'rtl_retail',
        title: 'Open The Cove (store) workspace',
        detail: 'Register (scan codes), Cove products, and inventory.',
        workspace: 'retail',
        actionLabel: 'Open The Cove',
      },
      {
        id: 'rtl_page_copy',
        title: 'Edit Cove page copy',
        detail: 'Hero / how-it-works / CTA / spirit wear copy on public /cove.',
        workspace: 'content',
        actionLabel: 'Open Page copy',
      },
      {
        id: 'rtl_discounts',
        title: 'Review Discount codes',
        detail: 'Coupons for checkout / spirit — coordinate with Treasurer.',
        workspace: 'discounts',
        actionLabel: 'Open Discounts',
      },
      {
        id: 'rtl_site',
        title: 'Check Site settings · retail',
        detail: 'Storefront allowlists and Cove-related site fields.',
        workspace: 'site',
        actionLabel: 'Open Site settings',
      },
      {
        id: 'rtl_reports',
        title: 'Open Cove reports',
        detail: 'See Cove / store-card sales; Treasurer still owns Payments reconciliation.',
        workspace: 'reports',
        actionLabel: 'Open Reports',
      },
      ...sharedEnd('rtl'),
    ],
  },
  membership: {
    role: 'membership',
    title: 'VP Membership Experience onboarding',
    summary: 'Roster, tiers, mass email / WhatsApp, and member help routing.',
    steps: [
      ...sharedStart('mem'),
      {
        id: 'mem_membership',
        title: 'Open Memberships roster',
        detail: 'Search households, mass email, WhatsApp compose.',
        workspace: 'membership',
        actionLabel: 'Open Memberships',
      },
      {
        id: 'mem_tiers',
        title: 'Review Membership tiers',
        detail: 'Reef · Lagoon · Tide map — Catalog still owns paid display copy.',
        workspace: 'tiers',
        actionLabel: 'Open Membership tiers',
      },
      {
        id: 'mem_newsletter',
        title: 'Tour Newsletter & WhatsApp queue',
        detail: 'Member blasts to free/paid and grade WhatsApp groups.',
        workspace: 'newsletter',
        actionLabel: 'Open Newsletter',
      },
      {
        id: 'mem_faq',
        title: 'Review FAQs parents see',
        detail: 'Portal help FAQ content for join / upgrade / Cove questions.',
        workspace: 'faq',
        actionLabel: 'Open FAQs',
      },
      {
        id: 'mem_comms',
        title: 'Use Comms calendar for membership pushes',
        detail: 'Open House, renewal, and upgrade campaigns live on the month grid.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      ...sharedEnd('mem'),
    ],
  },
  wellness: {
    role: 'wellness',
    title: 'Teacher & Staff Wellness onboarding',
    summary: 'Appreciation notes, wish lists, and event partnerships.',
    steps: [
      ...sharedStart('wel'),
      {
        id: 'wel_wellness',
        title: 'Open Wellness workspace',
        detail: 'Wish list and appreciation notes for teachers / staff.',
        workspace: 'wellness',
        actionLabel: 'Open Wellness',
      },
      {
        id: 'wel_events',
        title: 'Partner with Events',
        detail: 'Appreciation often runs through Events — know the Events board.',
        workspace: 'events',
        actionLabel: 'Open Events',
      },
      {
        id: 'wel_comms',
        title: 'Schedule wellness notes on Comms',
        detail: 'Teacher appreciation messages to school / board go on the calendar.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      ...sharedEnd('wel'),
    ],
  },
  instructor: {
    role: 'instructor',
    title: 'Instructor onboarding',
    summary: 'Your assigned programs, sessions, and parent Messages.',
    steps: [
      ...sharedStart('ins'),
      {
        id: 'ins_programs',
        title: 'Open Programs (your sessions)',
        detail: 'Confirm sessions and registration state for programs you teach.',
        workspace: 'programs',
        actionLabel: 'Open Programs',
      },
      {
        id: 'ins_messages',
        title: 'Open Messages',
        detail: 'Reply to parents about your program.',
        workspace: 'messages',
        actionLabel: 'Open Messages',
      },
      {
        id: 'ins_calendar',
        title: 'Connect Calendar view',
        detail: 'See your @shmspto.org calendar inside Staff.',
        workspace: 'calendar',
        actionLabel: 'Open Calendar',
      },
      ...sharedEnd('ins'),
    ],
  },
  coordinator: {
    role: 'coordinator',
    title: 'Coordinator onboarding',
    summary: 'Support assigned programs and day-to-day parent Messages.',
    steps: [
      ...sharedStart('crd'),
      {
        id: 'crd_programs',
        title: 'Open Programs for your assignment',
        detail: 'Know which programs you support and their registration state.',
        workspace: 'programs',
        actionLabel: 'Open Programs',
      },
      {
        id: 'crd_messages',
        title: 'Open Messages',
        detail: 'Help answer parent questions for your lane.',
        workspace: 'messages',
        actionLabel: 'Open Messages',
      },
      {
        id: 'crd_projects',
        title: 'Check Projects tasks',
        detail: 'Pick up any coordinator tasks on the year board.',
        workspace: 'projects',
        actionLabel: 'Open Projects',
      },
      ...sharedEnd('crd'),
    ],
  },
}

export function isStaffOnboardingRole(role: string): role is StaffOnboardingRole {
  return (STAFF_ONBOARDING_ROLES as readonly string[]).includes(role)
}

/** President mailbox skips checklists; everyone else gets matching role tracks. */
export function shouldShowStaffOnboarding(email: string): boolean {
  return !isPresidentAdminEmail(email)
}

/**
 * Which tracks to show.
 * - president@ → none
 * - admin (non-president) → all tracks (board training)
 * - others → tracks matching their StaffRoles
 */
export function onboardingRolesFor(
  roles: StaffRole[],
  email?: string,
): StaffOnboardingRole[] {
  if (email && !shouldShowStaffOnboarding(email)) return []
  if (roles.includes('admin')) return [...STAFF_ONBOARDING_ROLES]
  return STAFF_ONBOARDING_ROLES.filter((r) => roles.includes(r))
}

export type OnboardingProgressMap = Record<string, string>

export function parseOnboardingProgress(raw: unknown): OnboardingProgressMap {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out: OnboardingProgressMap = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    }
    return out
  }
  const text = String(raw).trim()
  if (!text) return {}
  try {
    const parsed = JSON.parse(text) as unknown
    return parseOnboardingProgress(parsed)
  } catch {
    const out: OnboardingProgressMap = {}
    const now = new Date().toISOString()
    for (const id of text.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)) {
      out[id] = now
    }
    return out
  }
}

export function serializeOnboardingProgress(map: OnboardingProgressMap): string {
  return JSON.stringify(map)
}

export type BuiltOnboardingItem = StaffOnboardingStep & {
  done: boolean
  autoDone: boolean
}

export function buildTrackProgress(
  track: StaffOnboardingTrack,
  progress: OnboardingProgressMap,
  flags: { personalEmail: boolean; googleConnected: boolean },
): {
  items: BuiltOnboardingItem[]
  doneCount: number
  total: number
  complete: boolean
} {
  const items: BuiltOnboardingItem[] = track.steps.map((step) => {
    const autoDone =
      (step.autoKey === 'personalEmail' && flags.personalEmail) ||
      (step.autoKey === 'googleConnected' && flags.googleConnected)
    const done = autoDone || Boolean(progress[step.id])
    return { ...step, done, autoDone }
  })
  const doneCount = items.filter((i) => i.done).length
  return {
    items,
    doneCount,
    total: items.length,
    complete: doneCount === items.length && items.length > 0,
  }
}
