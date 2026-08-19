import { riversideSnapshot } from '@/lib/crm/riverside'
import { portalStudentsForHousehold, type PortalStudentRow } from '@/lib/crm/mappers'
import type { Household, TenantSnapshot } from '@/lib/crm/types'

export type ReviewerSession = {
  lastName?: string
  parentKind?: string
}

/** Paid tour = Nguyen household; free tour = Brooks. Last name comes from the review cookie. */
export function reviewerHousehold(
  session: ReviewerSession | null,
): { snapshot: TenantSnapshot; household: Household } {
  const snapshot = riversideSnapshot()
  const paid = session?.parentKind !== 'free'
  const membership = snapshot.memberships.find((m) => (paid ? m.tier === 'lagoon' : m.tier === 'free'))
  const household =
    snapshot.households.find((h) => h.id === membership?.householdId) ??
    snapshot.households[snapshot.households.length - 1]
  return { snapshot, household }
}

export function reviewerPortalStudents(
  session: ReviewerSession | null,
): PortalStudentRow[] {
  const { snapshot, household } = reviewerHousehold(session)
  return portalStudentsForHousehold(snapshot, household, session?.lastName)
}
