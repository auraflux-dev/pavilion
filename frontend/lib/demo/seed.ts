import { DEMO_BRAND } from '@/lib/demo/brand'

export const DEMO_SEED_MEMBERS = [
  {
    parentEmail: 'alex.nguyen@example.com',
    parentFirstName: 'Alex',
    parentLastName: 'Nguyen',
    parentPhone: '555-0101',
    membershipTier: 'lagoon',
    accountType: 'paid' as const,
    students: [
      {
        id: 'demo-stu-1',
        firstName: 'Maya',
        lastName: 'Nguyen',
        grade: '3',
        membershipTier: 'lagoon',
        archived: false,
      },
      {
        id: 'demo-stu-2',
        firstName: 'Leo',
        lastName: 'Nguyen',
        grade: '5',
        membershipTier: 'lagoon',
        archived: false,
      },
    ],
  },
  {
    parentEmail: 'jordan.patel@example.com',
    parentFirstName: 'Jordan',
    parentLastName: 'Patel',
    parentPhone: '555-0102',
    membershipTier: 'reef',
    accountType: 'paid' as const,
    students: [
      {
        id: 'demo-stu-3',
        firstName: 'Sam',
        lastName: 'Patel',
        grade: '2',
        membershipTier: 'reef',
        archived: false,
      },
    ],
  },
  {
    parentEmail: 'riley.brooks@example.com',
    parentFirstName: 'Riley',
    parentLastName: 'Brooks',
    parentPhone: '',
    membershipTier: 'free',
    accountType: 'free' as const,
    students: [
      {
        id: 'demo-stu-4',
        firstName: 'Casey',
        lastName: 'Brooks',
        grade: 'K',
        membershipTier: 'free',
        archived: false,
      },
    ],
  },
]

/** Sample CRM households a reviewer can join as (signed cookie, not Clerk). */
export const DEMO_JOIN_PROFILES = {
  staff: {
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@example.com',
    school: DEMO_BRAND.pto,
  },
  paid: {
    firstName: DEMO_SEED_MEMBERS[0].parentFirstName,
    lastName: DEMO_SEED_MEMBERS[0].parentLastName,
    email: DEMO_SEED_MEMBERS[0].parentEmail,
    school: DEMO_BRAND.pto,
  },
  free: {
    firstName: DEMO_SEED_MEMBERS[2].parentFirstName,
    lastName: DEMO_SEED_MEMBERS[2].parentLastName,
    email: DEMO_SEED_MEMBERS[2].parentEmail,
    school: DEMO_BRAND.pto,
  },
} as const

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
} | null): Array<{
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  archived: boolean
  storeCardBalance: number
  name: string
}> {
  const last = session?.lastName?.trim() || 'Brooks'
  const paid = session?.parentKind !== 'free'
  const rows = paid
    ? [
        { id: 'demo-stu-1', firstName: 'Maya', lastName: last, grade: '3', membershipTier: 'lagoon' as const, storeCardBalance: 42.5 },
        { id: 'demo-stu-2', firstName: 'Leo', lastName: last, grade: '5', membershipTier: 'lagoon' as const, storeCardBalance: 42.5 },
      ]
    : [
        { id: 'demo-stu-4', firstName: 'Casey', lastName: last, grade: 'K', membershipTier: 'free' as const, storeCardBalance: 0 },
      ]
  return rows.map((s) => ({
    ...s,
    membershipStatus: 'active',
    archived: false,
    name: `${s.firstName} ${s.lastName}`,
  }))
}

export function demoPiiStub(
  pathname: string,
  session?: { lastName?: string; parentKind?: string } | null,
): Record<string, unknown> {
  const students = demoReviewerStudents(session ?? null)
  const paid = session?.parentKind !== 'free'

  if (pathname.startsWith('/api/staff/members')) {
    return {
      members: DEMO_SEED_MEMBERS,
      summary: { parents: 3, paid: 2, free: 1, withPhone: 2 },
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
      cards: paid
        ? [{ studentName: students[0]?.name || 'Maya', balance: 42.5, label: DEMO_BRAND.card }]
        : [{ studentName: students[0]?.name || 'Casey', balance: 0, label: DEMO_BRAND.card }],
      demo: true,
    }
  }
  return { items: [], members: [], students, demo: true }
}
