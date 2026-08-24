import type { ParentRosterRow } from '@/lib/staff/members-roster'
import {
  accountTypeForTier,
  dollarsFromCents,
  type Household,
  type Membership,
  type Person,
  type StoreCard,
  type Student,
  type TenantSnapshot,
} from '@/lib/crm/types'

export type PortalStudentRow = {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  archived: boolean
  storeCardBalance: number
  name: string
  parentPhone: string
  emergencyContact: string
  emergencyPhone: string
  pickupAuthorized: string
  parentFirstName: string
  parentLastName: string
  familyProfileConfirmedAt: string
}

function personById(snapshot: TenantSnapshot, id: string): Person | undefined {
  return snapshot.people.find((p) => p.id === id)
}

function membershipFor(snapshot: TenantSnapshot, householdId: string): Membership | undefined {
  return snapshot.memberships.find((m) => m.householdId === householdId)
}

function cardFor(snapshot: TenantSnapshot, householdId: string): StoreCard | undefined {
  return snapshot.storeCards.find((c) => c.householdId === householdId)
}

export function snapshotToRoster(snapshot: TenantSnapshot): ParentRosterRow[] {
  return snapshot.households.map((hh) => householdToRosterRow(snapshot, hh))
}

export function householdToRosterRow(
  snapshot: TenantSnapshot,
  hh: Household,
): ParentRosterRow {
  const primary = personById(snapshot, hh.primaryPersonId)
  const membership = membershipFor(snapshot, hh.id)
  const tier = membership?.tier ?? 'free'
  const kids = snapshot.students.filter((s) => s.householdId === hh.id)
  return {
    parentEmail: primary?.email ?? '',
    parentFirstName: primary?.firstName ?? '',
    parentLastName: primary?.lastName ?? '',
    parentPhone: primary?.phone ?? '',
    accountNumber: '',
    membershipTier: tier,
    accountType: accountTypeForTier(tier),
    students: kids.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      membershipTier: tier,
      membershipStatus: membership?.status ?? 'active',
      archived: s.archived,
    })),
  }
}

export function portalStudentsForHousehold(
  snapshot: TenantSnapshot,
  hh: Household,
  lastNameOverride?: string,
): PortalStudentRow[] {
  const primary = personById(snapshot, hh.primaryPersonId)
  const membership = membershipFor(snapshot, hh.id)
  const card = cardFor(snapshot, hh.id)
  const last = lastNameOverride?.trim() || primary?.lastName || ''
  const balance = dollarsFromCents(card?.balanceCents ?? 0)
  const tier = membership?.tier ?? 'free'
  return snapshot.students
    .filter((s) => s.householdId === hh.id && !s.archived)
    .map((s) => toPortalStudent(s, last, primary, hh, membership, balance, tier))
}

function toPortalStudent(
  s: Student,
  last: string,
  primary: Person | undefined,
  hh: Household,
  membership: Membership | undefined,
  balance: number,
  tier: string,
): PortalStudentRow {
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: last || s.lastName,
    grade: s.grade,
    membershipTier: tier,
    membershipStatus: membership?.status ?? 'active',
    archived: s.archived,
    storeCardBalance: balance,
    name: `${s.firstName} ${last || s.lastName}`.trim(),
    parentPhone: primary?.phone ?? '',
    emergencyContact: hh.emergencyContactName,
    emergencyPhone: hh.emergencyContactPhone,
    pickupAuthorized: hh.pickupAuthorized,
    parentFirstName: primary?.firstName ?? '',
    parentLastName: last || primary?.lastName || '',
    familyProfileConfirmedAt: hh.confirmedAt ?? '',
  }
}

export function rosterSummary(rows: ParentRosterRow[]): {
  parents: number
  paid: number
  free: number
  withPhone: number
} {
  return {
    parents: rows.length,
    paid: rows.filter((r) => r.accountType === 'paid').length,
    free: rows.filter((r) => r.accountType === 'free').length,
    withPhone: rows.filter((r) => Boolean(r.parentPhone.trim())).length,
  }
}
