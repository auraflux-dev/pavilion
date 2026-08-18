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
        grade: '6',
        membershipTier: 'lagoon',
        archived: false,
      },
      {
        id: 'demo-stu-2',
        firstName: 'Leo',
        lastName: 'Nguyen',
        grade: '8',
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
        grade: '7',
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
        grade: '6',
        membershipTier: 'free',
        archived: false,
      },
    ],
  },
]

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

export function demoPiiStub(pathname: string): Record<string, unknown> {
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
  if (pathname.startsWith('/api/portal/family')) {
    return {
      students: DEMO_SEED_MEMBERS[0].students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
        name: `${s.firstName} ${s.lastName}`,
      })),
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
          studentName: 'Maya Nguyen',
          balance: 42.5,
          label: DEMO_BRAND.card,
        },
      ],
      demo: true,
    }
  }
  return { items: [], members: [], students: [], demo: true }
}
