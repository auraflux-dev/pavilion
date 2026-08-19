import { DEMO_BRAND } from '@/lib/demo/brand'
import type {
  Household,
  Membership,
  Person,
  StoreCard,
  Student,
  TenantSnapshot,
} from '@/lib/crm/types'

const ORG_ID = 'org_riverside'

function person(
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
): Person {
  return {
    id,
    organizationId: ORG_ID,
    email,
    firstName,
    lastName,
    phone,
    authUserId: null,
  }
}

function household(
  id: string,
  primaryPersonId: string,
  safety: { emergency: string; emergencyPhone: string; pickup: string },
): Household {
  return {
    id,
    organizationId: ORG_ID,
    primaryPersonId,
    confirmedAt: null,
    emergencyContactName: safety.emergency,
    emergencyContactPhone: safety.emergencyPhone,
    pickupAuthorized: safety.pickup,
  }
}

function student(
  id: string,
  householdId: string,
  firstName: string,
  lastName: string,
  grade: string,
): Student {
  return {
    id,
    householdId,
    firstName,
    lastName,
    grade,
    archived: false,
    allergies: '',
    medicalConditions: '',
    medications: '',
    selfRelease: false,
    photoMediaConsent: null,
  }
}

function membership(
  id: string,
  householdId: string,
  tier: Membership['tier'],
): Membership {
  return {
    id,
    householdId,
    tier,
    status: 'active',
    expiresAt: null,
  }
}

function card(id: string, householdId: string, balanceCents: number): StoreCard {
  return {
    id,
    householdId,
    gan: balanceCents > 0 ? `PERCH-${householdId.slice(-4).toUpperCase()}` : '',
    externalId: '',
    balanceCents,
  }
}

/** Sample Commons tenant used by the Riverside demo roster. */
export function riversideSnapshot(): TenantSnapshot {
  const alex = person('p_alex', 'alex.nguyen@example.com', 'Alex', 'Nguyen', '555-0101')
  const jordanP = person('p_jordan_p', 'jordan.patel@example.com', 'Jordan', 'Patel', '555-0102')
  const riley = person('p_riley', 'riley.brooks@example.com', 'Riley', 'Brooks', '')
  const staff = person('p_jordan_lee', 'jordan.lee@example.com', 'Jordan', 'Lee', '')

  const hhNguyen = household('hh_nguyen', alex.id, {
    emergency: 'Sam Nguyen',
    emergencyPhone: '555-0191',
    pickup: 'Alex Nguyen, Sam Nguyen',
  })
  const hhPatel = household('hh_patel', jordanP.id, {
    emergency: 'Priya Patel',
    emergencyPhone: '555-0192',
    pickup: 'Jordan Patel, Priya Patel',
  })
  const hhBrooks = household('hh_brooks', riley.id, {
    emergency: '',
    emergencyPhone: '',
    pickup: '',
  })

  return {
    organization: {
      id: ORG_ID,
      name: DEMO_BRAND.pto,
      slug: 'riverside',
    },
    people: [alex, jordanP, riley, staff],
    households: [hhNguyen, hhPatel, hhBrooks],
    adults: [
      { householdId: hhNguyen.id, personId: alex.id, role: 'primary' },
      { householdId: hhPatel.id, personId: jordanP.id, role: 'primary' },
      { householdId: hhBrooks.id, personId: riley.id, role: 'primary' },
    ],
    students: [
      student('demo-stu-1', hhNguyen.id, 'Maya', 'Nguyen', '3'),
      student('demo-stu-2', hhNguyen.id, 'Leo', 'Nguyen', '5'),
      student('demo-stu-3', hhPatel.id, 'Sam', 'Patel', '2'),
      student('demo-stu-4', hhBrooks.id, 'Casey', 'Brooks', 'K'),
    ],
    memberships: [
      membership('mem_nguyen', hhNguyen.id, 'lagoon'),
      membership('mem_patel', hhPatel.id, 'reef'),
      membership('mem_brooks', hhBrooks.id, 'free'),
    ],
    storeCards: [
      card('card_nguyen', hhNguyen.id, 4250),
      card('card_patel', hhPatel.id, 0),
      card('card_brooks', hhBrooks.id, 0),
    ],
  }
}

export const DEMO_JOIN_PROFILES = {
  staff: {
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@example.com',
    school: DEMO_BRAND.pto,
  },
  paid: {
    firstName: 'Alex',
    lastName: 'Nguyen',
    email: 'alex.nguyen@example.com',
    school: DEMO_BRAND.pto,
  },
  free: {
    firstName: 'Riley',
    lastName: 'Brooks',
    email: 'riley.brooks@example.com',
    school: DEMO_BRAND.pto,
  },
} as const
