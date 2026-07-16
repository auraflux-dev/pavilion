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
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export type StaffProfile = {
  email: string
  roles: StaffRole[]
  boardTitle: string
  name: string
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

export async function getStaffProfile(email: string): Promise<StaffProfile | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

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
      'Schedule next spirit drop with Marketing',
      'Prep pop-up kit for next event',
    ],
  },
  membership: {
    title: 'Membership Experience',
    owns: 'Onboarding, 6th-grade comfort, upgrades, retention',
    thisWeek: [
      'Welcome new free members',
      'Flag upgrade candidates',
      'Plan Middle School 101 touchpoint',
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
    owns: 'Communicate with your enrollees and their parents',
    thisWeek: [
      'Send session reminders',
      'Share supply or schedule updates',
      'Flag attendance issues to Programs VP',
    ],
  },
}
