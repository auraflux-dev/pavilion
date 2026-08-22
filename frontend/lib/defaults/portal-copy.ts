/**
 * Member portal UI copy. Edited via Wix PageContent:
 * - `portal`. free/paid blurbs + empty-student / upgrade (legacy bullets)
 * - `portal-hub`. quadrant titles, empty states, CTAs (keyed bullets: key|text)
 * - `member-portal`. page hero (via PageHero)
 */

export type PortalCopy = {
  // Account (portal row)
  paidTitle: string
  paidBody: string
  freeTitle: string
  freeBody: string
  emptyTitle: string
  emptyBody: string
  upgradeBody: string
  viewMemberships: string

  // Quadrant titles / chrome
  calendarTitle: string
  accountTitle: string
  studentsTitle: string
  storeTitle: string
  tabCalendar: string
  tabMessages: string
  signOut: string
  refresh: string
  loadError: string

  // Calendar / messages empty
  calendarEmptyTitle: string
  calendarEmptyBody: string
  calendarEmptyCta: string
  messagesEmptyTitle: string
  messagesEmptyBody: string

  // Account meta labels
  memberSince: string
  studentsLabel: string
  paidMembershipsLabel: string
  whatsappHeading: string

  // Store quadrant
  storeCardsLabel: string
  storeCardsHint: string
  recentBuysLabel: string
  recentBuysHint: string
  ctaLoadCard: string
  ctaSpiritWear: string
  ctaPrograms: string
  purchasesEmpty: string

  // Add student form
  addStudentCta: string
  addStudentTitle: string
  firstNameLabel: string
  lastNameLabel: string
  gradeLabel: string
  addStudentSubmit: string
  cancel: string
  addStudentError: string
  loadCardHelp: string
  paymentMethodsTitle: string
  paymentMethodsBody: string
}

export const PORTAL_COPY_DEFAULTS: PortalCopy = {
  paidTitle: 'Paid PTO membership active',
  paidBody: 'Thanks for supporting SHMS PTO.\nBenefits show on each student below.',
  freeTitle: 'Free parent account',
  freeBody: 'Add students below.\nUpgrade to Reef, Lagoon, or Tide anytime.',
  emptyTitle: 'Add your first student',
  emptyBody: 'Programs, the store card, and membership unlock after you add a student.\nUse Add student below. It takes about a minute.',
  upgradeBody:
    'Paid members get Cove credit and enrichment discounts.\nLagoon and Tide include event refreshments.',
  viewMemberships: 'View paid memberships',

  calendarTitle: 'Calendar & Messages',
  accountTitle: 'My Account',
  studentsTitle: 'My Students',
  storeTitle: 'Store & Cove Digital Card',
  tabCalendar: 'Calendar',
  tabMessages: 'Messages',
  signOut: 'Sign out',
  refresh: 'Refresh',
  loadError: 'Could not load your portal.',

  calendarEmptyTitle: 'No dates yet',
  calendarEmptyBody: 'Session times and school events show here after you enroll.',
  calendarEmptyCta: 'Browse programs',
  messagesEmptyTitle: 'Inbox empty',
  messagesEmptyBody: 'Class notes and PTO updates land here.\nNeed help now? Open Portal Help from the top of this page.',

  memberSince: 'Member since',
  studentsLabel: 'Students',
  paidMembershipsLabel: 'Paid memberships',
  whatsappHeading: 'Grade WhatsApp',

  storeCardsLabel: 'Family Cove Digital Card',
  storeCardsHint: 'Current Balance',
  recentBuysLabel: 'Recent buys',
  recentBuysHint: 'Purchases',
  ctaLoadCard: 'Load Cove Digital Card',
  ctaSpiritWear: 'Spirit wear',
  ctaPrograms: 'Programs',
  purchasesEmpty: 'Membership, program, and Cove loads will list here.',

  addStudentCta: 'Add a student',
  addStudentTitle: 'Add a student',
  firstNameLabel: 'First name',
  lastNameLabel: 'Last name',
  gradeLabel: 'Grade',
  addStudentSubmit: 'Add student',
  cancel: 'Cancel',
  addStudentError: 'Could not add student. Please try again.',
  loadCardHelp: 'Load $20, $40, $75, or any whole dollar amount.',
  paymentMethodsTitle: 'Saved Payment Methods',
  paymentMethodsBody: 'Optional card on file for Cove reloads and auto top-off.',
}

/** Parse `key|value` lines (store-how style). Value may contain `|`. */
export function parseKeyedLines(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of lines) {
    const i = line.indexOf('|')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()
    if (key && value) out[key] = value
  }
  return out
}

export function portalHubBulletsDefault(): string {
  const keys: (keyof PortalCopy)[] = [
    'calendarTitle',
    'accountTitle',
    'studentsTitle',
    'storeTitle',
    'tabCalendar',
    'tabMessages',
    'signOut',
    'refresh',
    'loadError',
    'calendarEmptyTitle',
    'calendarEmptyBody',
    'calendarEmptyCta',
    'messagesEmptyTitle',
    'messagesEmptyBody',
    'viewMemberships',
    'memberSince',
    'studentsLabel',
    'paidMembershipsLabel',
    'whatsappHeading',
    'storeCardsLabel',
    'storeCardsHint',
    'recentBuysLabel',
    'recentBuysHint',
    'ctaLoadCard',
    'ctaSpiritWear',
    'ctaPrograms',
    'purchasesEmpty',
    'addStudentCta',
    'addStudentTitle',
    'firstNameLabel',
    'lastNameLabel',
    'gradeLabel',
    'addStudentSubmit',
    'cancel',
    'addStudentError',
    'loadCardHelp',
    'paymentMethodsTitle',
    'paymentMethodsBody',
  ]
  return keys.map((k) => `${k}|${PORTAL_COPY_DEFAULTS[k]}`).join('\n')
}
