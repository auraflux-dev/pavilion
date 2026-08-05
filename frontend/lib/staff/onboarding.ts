/**
 * First-login / role onboarding checklists for key board roles.
 * Progress is stored on StaffRoles.onboardingProgress (JSON map of stepId → ISO).
 */
import type { StaffRole } from '@/lib/staff/roles'
import type { StaffWorkspace } from '@/lib/audience'

export const STAFF_ONBOARDING_ROLES = ['marketing', 'secretary', 'treasurer'] as const
export type StaffOnboardingRole = (typeof STAFF_ONBOARDING_ROLES)[number]

export type StaffOnboardingStep = {
  id: string
  title: string
  detail: string
  /** Deep-link into a Staff workspace when possible. */
  workspace?: StaffWorkspace
  /** External systems Treasurer still uses outside Staff. */
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

export const STAFF_ONBOARDING_TRACKS: Record<StaffOnboardingRole, StaffOnboardingTrack> = {
  marketing: {
    role: 'marketing',
    title: 'VP Marketing onboarding',
    summary:
      'Connect Google, learn the content calendar, and know where social, newsletter, and site copy live.',
    steps: [
      {
        id: 'mkt_google',
        title: 'Connect Google Workspace',
        detail: 'Inbox, Calendar, and Docs for your @shmspto.org account.',
        workspace: 'inbox',
        actionLabel: 'Open Inbox',
        autoKey: 'googleConnected',
      },
      {
        id: 'mkt_personal_email',
        title: 'Save personal email on Home',
        detail: 'Parent portal (students / Cove) uses personal Gmail — not @shmspto.org.',
        workspace: 'home',
        actionLabel: 'Go to Home',
        autoKey: 'personalEmail',
      },
      {
        id: 'mkt_comms',
        title: 'Open Comms & content calendar',
        detail: 'Plan the next two weeks: Communications + Content planner month grid.',
        workspace: 'comms',
        actionLabel: 'Open Comms & content',
      },
      {
        id: 'mkt_canva',
        title: 'Connect Canva in Staff',
        detail: 'Staff → Canva. Browse designs and copy edit links into Comms / Social.',
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
      {
        id: 'mkt_help',
        title: 'Skim Help · Comms calendar article',
        detail: 'In-app KB plus Drive doc 46 for the full how-to.',
        workspace: 'help',
        actionLabel: 'Open Help',
      },
    ],
  },
  secretary: {
    role: 'secretary',
    title: 'Secretary onboarding',
    summary:
      'Own minutes, the member/school/board comms calendar, board roster, and legal surfaces.',
    steps: [
      {
        id: 'sec_google',
        title: 'Connect Google Workspace',
        detail: 'Mail, calendar, and Drive docs for board work.',
        workspace: 'inbox',
        actionLabel: 'Open Inbox',
        autoKey: 'googleConnected',
      },
      {
        id: 'sec_personal_email',
        title: 'Save personal email on Home',
        detail: 'Keep @shmspto.org for Staff; personal email for the parent portal.',
        workspace: 'home',
        actionLabel: 'Go to Home',
        autoKey: 'personalEmail',
      },
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
      {
        id: 'sec_help',
        title: 'Skim Help for Secretary tools',
        detail: 'Quick Start, roles map, and comms calendar articles.',
        workspace: 'help',
        actionLabel: 'Open Help',
      },
    ],
  },
  treasurer: {
    role: 'treasurer',
    title: 'Treasurer onboarding',
    summary:
      'Reconcile payments in Staff, clear expenses, and keep MoneyMinder / Square / bank as books of record.',
    steps: [
      {
        id: 'tre_google',
        title: 'Connect Google Workspace',
        detail: 'Inbox for vendor and parent money questions.',
        workspace: 'inbox',
        actionLabel: 'Open Inbox',
        autoKey: 'googleConnected',
      },
      {
        id: 'tre_personal_email',
        title: 'Save personal email on Home',
        detail: 'Parent portal stays on personal email; Staff stays @shmspto.org.',
        workspace: 'home',
        actionLabel: 'Go to Home',
        autoKey: 'personalEmail',
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
      {
        id: 'tre_help',
        title: 'Skim Help · money systems note',
        detail: 'Staff does ops; PayPal / Square / MoneyMinder / bank stay separate logins.',
        workspace: 'help',
        actionLabel: 'Open Help',
      },
    ],
  },
}

export function isStaffOnboardingRole(role: string): role is StaffOnboardingRole {
  return (STAFF_ONBOARDING_ROLES as readonly string[]).includes(role)
}

/** Admin sees all three tracks (board training). Others see matching roles only. */
export function onboardingRolesFor(roles: StaffRole[]): StaffOnboardingRole[] {
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
    // comma-separated completed ids
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
