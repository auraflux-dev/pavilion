import { DEMO_BRAND } from '@/lib/demo/brand'
import type { PortalStudentRow } from '@/lib/crm/mappers'

const YEAR = '2026-27'

function mailThreads() {
  return [
    {
      id: 'demo-mail-1',
      subject: `Fall Festival volunteers — ${DEMO_BRAND.store} window`,
      snippet: 'Can we add a second Saturday shift for snack pickup?',
      date: '2026-09-12T14:22:00.000Z',
      from: 'Elena Ruiz <secretary@riversidepto.org>',
      participants: ['Elena Ruiz', 'Jordan Lee'],
      messageCount: 3,
      unread: true,
      labelIds: ['INBOX'],
      bodyText:
        'Jordan — we are short one window shift on Fall Festival Saturday. Can Membership ping Family-tier parents?',
      bodyHtml: '',
      threadId: 'demo-mail-1',
    },
    {
      id: 'demo-mail-2',
      subject: 'Reimbursement: art studio clay',
      snippet: 'Receipt attached for $48.20 from Fairhaven Craft.',
      date: '2026-09-11T18:04:00.000Z',
      from: 'Marcus Hale <treasurer@riversidepto.org>',
      participants: ['Marcus Hale', 'Jordan Lee'],
      messageCount: 2,
      unread: true,
      labelIds: ['INBOX'],
      bodyText: 'Logged in Expenses. Needs your OK before I mark it paid.',
      bodyHtml: '',
      threadId: 'demo-mail-2',
    },
    {
      id: 'demo-mail-3',
      subject: 'Back to School Night recap',
      snippet: `${DEMO_BRAND.short} signed 38 families. ${DEMO_BRAND.card} loads were the bottleneck.`,
      date: '2026-09-11T01:10:00.000Z',
      from: 'Priya Shah <president@riversidepto.org>',
      participants: ['Priya Shah', 'Jordan Lee'],
      messageCount: 1,
      unread: false,
      labelIds: ['INBOX'],
      bodyText: 'Sample thread for the demo inbox. Nothing is sent.',
      bodyHtml: '',
      threadId: 'demo-mail-3',
    },
  ]
}

function budgetPayload() {
  const lines = [
    {
      id: 'demo-inc-mem',
      fiscalYear: YEAR,
      kind: 'income' as const,
      category: 'Membership',
      name: 'Family memberships',
      budgeted: 8000,
      actual: 6240,
      owner: 'Membership',
      notes: '',
      sortOrder: 1,
      syncKey: 'memberships',
      tracking: 'auto' as const,
      entryCount: 12,
    },
    {
      id: 'demo-inc-store',
      fiscalYear: YEAR,
      kind: 'income' as const,
      category: DEMO_BRAND.store,
      name: `${DEMO_BRAND.card} loads`,
      budgeted: 6000,
      actual: 3180,
      owner: 'Retail',
      notes: '',
      sortOrder: 2,
      syncKey: 'cove_loads',
      tracking: 'auto' as const,
      entryCount: 18,
    },
    {
      id: 'demo-exp-prog',
      fiscalYear: YEAR,
      kind: 'expense' as const,
      category: 'Programs',
      name: 'Enrichment supplies',
      budgeted: 3500,
      actual: 1480,
      owner: 'Programs',
      notes: '',
      sortOrder: 3,
      syncKey: 'enrichment_fees',
      tracking: 'keyed' as const,
      entryCount: 4,
    },
  ]
  return {
    year: YEAR,
    label: 'Jul 1, 2026 – Jun 30, 2027',
    lines,
    summary: {
      incomeBudgeted: 14000,
      incomeActual: 9420,
      expenseBudgeted: 3500,
      expenseActual: 1480,
      netBudgeted: 10500,
      netActual: 7940,
    },
    entries: [
      {
        id: 'demo-ent-1',
        lineSyncKey: 'memberships',
        occurredAt: '2026-09-08',
        amount: 149,
        memo: 'Alex Nguyen · Family',
        origin: 'auto-payment',
      },
    ],
    plaid: { configured: false, connected: false },
    bankConnected: false,
    demo: true,
  }
}

function familyExtras(paid: boolean, students: PortalStudentRow[]) {
  const child = students[0]?.firstName || (paid ? 'Maya' : 'Casey')
  if (!paid) {
    return {
      calendar: [] as Record<string, unknown>[],
      messages: [] as Record<string, unknown>[],
      purchases: [] as Record<string, unknown>[],
    }
  }
  return {
    calendar: [
      {
        id: 'demo-cal-art',
        title: 'After-school art studio',
        startAt: '2026-09-22T19:30:00.000Z',
        endAt: '2026-09-22T20:30:00.000Z',
        location: `${DEMO_BRAND.school} art room`,
        studentName: child,
      },
      {
        id: 'demo-cal-run',
        title: 'Morning running club',
        startAt: '2026-09-14T11:15:00.000Z',
        endAt: '2026-09-14T11:50:00.000Z',
        location: `${DEMO_BRAND.school} track`,
        studentName: students[1]?.firstName || child,
      },
    ],
    messages: [
      {
        id: 'demo-msg-1',
        subject: 'Art studio supply list',
        body: `Hi — ${child} is in Tuesday art. Smock optional. ${DEMO_BRAND.short} provides clay.`,
        sentAt: '2026-09-09T15:00:00.000Z',
        fromName: 'Programs',
      },
      {
        id: 'demo-msg-2',
        subject: `${DEMO_BRAND.store} hours this week`,
        body: 'Window is open Monday–Friday during lunch. Load the family card anytime.',
        sentAt: '2026-09-10T12:00:00.000Z',
        fromName: DEMO_BRAND.store,
      },
    ],
    purchases: [
      {
        id: 'demo-buy-1',
        label: `${DEMO_BRAND.card} load`,
        amount: 40,
        purchasedAt: '2026-09-08T16:00:00.000Z',
      },
      {
        id: 'demo-buy-2',
        label: 'Pretzel pack',
        amount: 1.5,
        purchasedAt: '2026-09-09T16:40:00.000Z',
      },
      {
        id: 'demo-buy-3',
        label: `${DEMO_BRAND.mascotPlural} tee`,
        amount: 22,
        purchasedAt: '2026-09-10T18:12:00.000Z',
      },
    ],
  }
}

export function demoStaffApiStub(
  pathname: string,
  session: { lastName?: string; parentKind?: string } | null,
  students: PortalStudentRow[],
): Record<string, unknown> | null {
  const paid = session?.parentKind !== 'free'

  if (pathname.startsWith('/api/portal/membership-benefits')) {
    if (!paid) {
      return { entitlements: [], discountCode: '', tier: '', demo: true }
    }
    return {
      tier: DEMO_BRAND.tiers.lagoon,
      shirtSize: 'M',
      entitlements: [
        { kind: 'store_credit', label: `$${40} ${DEMO_BRAND.card} credit`, status: 'active' },
        { kind: 'spirit_shirt', label: `${DEMO_BRAND.mascotPlural} tee`, status: 'pending' },
        { kind: 'magnet', label: 'Car magnet', status: 'pending' },
      ],
      discountCode: 'RIVERSIDEFAMILY15',
      coveFamilyCode: '482019',
      paidMemberCode: true,
      demo: true,
    }
  }

  if (pathname.startsWith('/api/portal/family') || pathname.startsWith('/api/students')) {
    return {
      students,
      ...familyExtras(paid, students),
      demo: true,
    }
  }

  if (pathname.startsWith('/api/gift-card')) {
    return {
      cards: [
        {
          studentName: students[0]?.name || (paid ? 'Maya Nguyen' : 'Casey Brooks'),
          balance: students[0]?.storeCardBalance ?? 0,
          label: DEMO_BRAND.card,
          hasCard: paid,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/budget')) {
    return budgetPayload()
  }

  if (pathname.startsWith('/api/staff/payments')) {
    return {
      payments: [
        {
          id: 'demo-pay-1',
          studentId: students[0]?.id || 'demo-stu-1',
          programName: 'Family membership',
          amount: 149,
          status: 'Needs Reconciliation',
          paymentDate: '2026-09-08T16:02:00.000Z',
          paymentMethod: 'Card',
          transactionId: 'demo-txn-1',
          source: 'checkout',
          payerEmail: 'alex.nguyen@example.com',
          payerName: 'Alex Nguyen',
          syncedToMoneyMinder: false,
        },
        {
          id: 'demo-pay-2',
          studentId: students[0]?.id || 'demo-stu-1',
          programName: `${DEMO_BRAND.card} load`,
          amount: 40,
          status: 'Needs Reconciliation',
          paymentDate: '2026-09-08T16:08:00.000Z',
          paymentMethod: 'Card',
          transactionId: 'demo-txn-2',
          source: 'gift-card',
          payerEmail: 'alex.nguyen@example.com',
          payerName: 'Alex Nguyen',
          syncedToMoneyMinder: false,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/events')) {
    return {
      events: [
        {
          id: 'demo-btsn',
          title: 'Back to School Night',
          description: `Meet teachers and load a ${DEMO_BRAND.card}.`,
          location: `${DEMO_BRAND.school} cafeteria`,
          startDate: '2026-09-10T23:00:00.000Z',
          endDate: '2026-09-11T01:00:00.000Z',
          slug: 'back-to-school-night',
          image: '/demo/community.jpg',
        },
        {
          id: 'demo-fest',
          title: 'Fall Festival',
          description: `Carnival games and a ${DEMO_BRAND.store} window.`,
          location: `${DEMO_BRAND.school} blacktop`,
          startDate: '2026-10-24T16:00:00.000Z',
          endDate: '2026-10-24T21:00:00.000Z',
          slug: 'fall-festival',
          image: '/demo/hero-a.jpg',
        },
      ],
      manageUrl: '',
      note: 'Sample events for this demo. Creates do not publish.',
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/programs')) {
    return {
      programs: [
        {
          id: 'demo-prog-art',
          name: 'After-school art studio',
          fee: 85,
          capacity: 16,
          seatsTaken: 9,
          seatsRemaining: 7,
          registrationOpen: true,
          grades: 'K,1,2,3,4,5',
        },
        {
          id: 'demo-prog-code',
          name: 'Lego builders club',
          fee: 40,
          capacity: 20,
          seatsTaken: 11,
          seatsRemaining: 9,
          registrationOpen: true,
          grades: 'K,1,2,3,4,5',
        },
      ],
      sessions: [
        {
          id: 'demo-sess-art-1',
          programId: 'demo-prog-art',
          startAt: '2026-09-22T19:30:00.000Z',
          title: 'Week 1',
        },
      ],
      canManageAll: true,
      assignedProgramIds: null,
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/workspace/mail')) {
    const threads = mailThreads()
    return { threads, thread: threads[0], message: threads[0], demo: true }
  }

  if (pathname.startsWith('/api/staff/workspace/status')) {
    return {
      email: 'jordan.lee@example.com',
      delegationConfigured: true,
      connectAvailable: false,
      connected: true,
      capabilities: { mail: true, calendar: true, docs: true, reply: true },
      setupHint: null,
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/workspace/calendar')) {
    return {
      events: [
        {
          id: 'demo-gcal-1',
          title: 'Board meeting',
          start: '2026-09-08T23:00:00.000Z',
          end: '2026-09-09T00:30:00.000Z',
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/workspace/docs')) {
    return {
      docs: [
        { id: 'demo-doc-1', title: `${DEMO_BRAND.short} board agenda`, url: '#' },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/roles')) {
    return {
      availableRoles: [
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
      ],
      staff: [
        {
          id: 'demo-staff-jordan',
          email: 'jordan.lee@example.com',
          name: 'Jordan Lee',
          boardTitle: 'President (demo)',
          roles: ['admin'],
          assignedProgramIds: [],
          personalEmail: 'jordan.lee@example.com',
          extraWorkspaces: [],
          active: true,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/expenses')) {
    return {
      expenses: [
        {
          id: 'demo-exp-1',
          amount: 48.2,
          memo: 'Art studio clay',
          status: 'pending',
          submittedBy: 'Marcus Hale',
          submittedAt: '2026-09-11T18:00:00.000Z',
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/minutes')) {
    return {
      minutes: [
        {
          id: 'demo-min-1',
          title: 'September board meeting',
          meetingDate: '2026-09-08',
          published: true,
          summary: `Sample minutes for ${DEMO_BRAND.short}.`,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/surveys')) {
    return {
      surveys: [
        {
          id: 'demo-survey-1',
          title: 'Fall Festival interest',
          status: 'open',
          responseCount: 24,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/membership/outreach')) {
    return { items: [], drafts: [], demo: true }
  }

  if (pathname.startsWith('/api/staff/cove/products')) {
    return {
      products: [
        {
          id: 'demo-snack-1',
          name: 'Pretzel pack',
          price: 1.5,
          sku: 'PERCH-PRETZEL',
          quantity: 40,
          showOnCove: true,
        },
        {
          id: 'demo-snack-2',
          name: 'Bottled water',
          price: 1,
          sku: 'PERCH-WATER',
          quantity: 60,
          showOnCove: true,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/cove/demand')) {
    return { items: [], demo: true }
  }

  if (pathname.startsWith('/api/staff/discounts')) {
    return {
      discounts: [
        {
          id: 'demo-disc-family',
          code: 'RIVERSIDEFAMILY15',
          label: `${DEMO_BRAND.tiers.lagoon} member`,
          percent: 15,
        },
      ],
      demo: true,
    }
  }

  if (pathname.startsWith('/api/staff/timesheets')) {
    return { timesheets: [], demo: true }
  }

  if (pathname.startsWith('/api/staff/tasks')) {
    return { tasks: [], demo: true }
  }

  return null
}
