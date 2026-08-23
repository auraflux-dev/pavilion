import { demoPiiStub } from '@/lib/demo/seed'
import { riversideSnapshot, rosterSummary, snapshotToRoster } from '@/lib/crm'
import { FIXTURE_MEMBERSHIP_QUOTE } from '@/lib/fixtures/checkout'

const FIXTURE_ROSTER = snapshotToRoster(riversideSnapshot())

function outreachFixture() {
  return {
    emailConfigured: false,
    gmailSender: 'preview@example.com',
    gmailHint: 'Synthetic staging. Gmail send is off. UI preview only.',
    whatsapp: { grade6: '', grade7: '', grade8: '' },
    testGroups: {
      me: { email: 'reviewer@example.com', label: 'Just me (fixture)' },
      board: [
        { email: 'president@example.com', label: 'President (fixture)' },
        { email: 'treasurer@example.com', label: 'Treasurer (fixture)' },
      ],
      custom: [],
    },
    subscriberCount: 12,
    canApproveNewsletter: true,
    synthetic: true,
  }
}

function membersFixture() {
  return {
    members: FIXTURE_ROSTER,
    summary: rosterSummary(FIXTURE_ROSTER),
    synthetic: true,
  }
}

/**
 * API stubs for synthetic staging (shmspto.vercel.app) and local dev fixtures.
 * Reuses Riverside demo shapes — no real parent/staff/student/financial data.
 */
export function fixturePiiStub(
  pathname: string,
  session?: { lastName?: string; parentKind?: string } | null,
): Record<string, unknown> {
  if (pathname.startsWith('/api/staff/membership/outreach')) {
    return outreachFixture()
  }
  if (pathname.startsWith('/api/staff/members')) {
    return membersFixture()
  }
  const demo = demoPiiStub(pathname, session ?? null)
  if (demo && Object.keys(demo).length) {
    return { ...demo, synthetic: true }
  }
  return { items: [], synthetic: true }
}

export function fixtureCheckoutQuote(kind: string): Record<string, unknown> | null {
  if (kind === 'membership') return FIXTURE_MEMBERSHIP_QUOTE
  if (kind === 'product') return { ...FIXTURE_MEMBERSHIP_QUOTE, kind: 'product', amount: 22, name: 'Sample product' }
  if (kind === 'program') return { ...FIXTURE_MEMBERSHIP_QUOTE, kind: 'program', amount: 85, name: 'Sample program' }
  return null
}
