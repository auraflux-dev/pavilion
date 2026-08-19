import { DEMO_BRAND } from '@/lib/demo/brand'
import {
  DEMO_JOIN_PROFILES,
  reviewerPortalStudents,
  riversideSnapshot,
  rosterSummary,
  snapshotToRoster,
} from '@/lib/crm'

export { DEMO_JOIN_PROFILES }

export const DEMO_SEED_MEMBERS = snapshotToRoster(riversideSnapshot())

export const DEMO_SEED_ACTIVITY = [
  {
    id: 'demo-inbox',
    label: 'Inbox (sample)',
    count: 3,
    href: '/staff?view=inbox',
    tone: 'info' as const,
  },
  {
    id: 'demo-pay',
    label: 'Payments to review (sample)',
    count: 2,
    href: '/staff?view=payments',
    tone: 'warn' as const,
  },
]

export function demoReviewerStudents(session: {
  lastName?: string
  parentKind?: string
} | null) {
  return reviewerPortalStudents(session)
}

export function demoPiiStub(
  pathname: string,
  session?: { lastName?: string; parentKind?: string } | null,
): Record<string, unknown> {
  const students = demoReviewerStudents(session ?? null)
  const paid = session?.parentKind !== 'free'
  const roster = DEMO_SEED_MEMBERS

  if (pathname.startsWith('/api/staff/members')) {
    return {
      members: roster,
      summary: rosterSummary(roster),
      demo: true,
    }
  }
  if (pathname.startsWith('/api/staff/activity')) {
    return { items: DEMO_SEED_ACTIVITY, demo: true }
  }
  if (pathname.startsWith('/api/portal/family') || pathname.startsWith('/api/students')) {
    return {
      students,
      calendar: [],
      messages: [],
      purchases: [],
      demo: true,
    }
  }
  if (pathname.startsWith('/api/gift-card')) {
    return {
      cards: [
        {
          studentName: students[0]?.name || (paid ? 'Maya' : 'Casey'),
          balance: students[0]?.storeCardBalance ?? 0,
          label: DEMO_BRAND.card,
        },
      ],
      demo: true,
    }
  }
  return { items: [], members: [], students, demo: true }
}
