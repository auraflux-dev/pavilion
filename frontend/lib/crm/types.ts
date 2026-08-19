/**
 * Commons CRM — households, students, membership, store card.
 * Stone Hill stays on Wix CMS. These types are the Postgres contract and the
 * demo in-memory tenant. Login (Better Auth) is a later FK on Person.authUserId.
 */

export type MembershipTierId = 'free' | 'reef' | 'lagoon' | 'tide' | 'faculty'
export type AccountType = 'free' | 'paid'
export type AdultRole = 'primary' | 'guardian'
export type MembershipStatus = 'none' | 'active' | 'expired'

export type Organization = {
  id: string
  name: string
  slug: string
}

export type Person = {
  id: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  /** Null until Better Auth. Demo review cookies never set this. */
  authUserId: string | null
}

export type Household = {
  id: string
  organizationId: string
  primaryPersonId: string
  confirmedAt: string | null
  emergencyContactName: string
  emergencyContactPhone: string
  pickupAuthorized: string
}

export type HouseholdAdult = {
  householdId: string
  personId: string
  role: AdultRole
}

export type Student = {
  id: string
  householdId: string
  firstName: string
  lastName: string
  grade: string
  archived: boolean
  allergies: string
  medicalConditions: string
  medications: string
  selfRelease: boolean
  photoMediaConsent: boolean | null
}

export type Membership = {
  id: string
  householdId: string
  tier: MembershipTierId
  status: MembershipStatus
  expiresAt: string | null
}

export type StoreCard = {
  id: string
  householdId: string
  gan: string
  externalId: string
  /** Integer cents. Wix still stores dollars on student rows. */
  balanceCents: number
}

export type TenantSnapshot = {
  organization: Organization
  people: Person[]
  households: Household[]
  adults: HouseholdAdult[]
  students: Student[]
  memberships: Membership[]
  storeCards: StoreCard[]
}

export function isPaidTier(tier: MembershipTierId | string): boolean {
  const t = String(tier ?? 'free').toLowerCase()
  return t !== 'free' && t !== 'none' && t !== ''
}

export function accountTypeForTier(tier: MembershipTierId | string): AccountType {
  return isPaidTier(tier) ? 'paid' : 'free'
}

export function dollarsFromCents(cents: number): number {
  return Math.round(cents) / 100
}
