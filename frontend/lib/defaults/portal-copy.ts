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
  paidBody:
    'Thanks for supporting SHMS PTO. Your paid membership benefits show on each student card below.',
  freeTitle: 'Free parent account',
  freeBody:
    "You're signed in as a free parent member. Add your students here, then upgrade to Reef, Lagoon, or Tide anytime for paid benefits.",
  emptyTitle: 'Welcome to the SHMS PTO',
  emptyBody:
    'Your free parent account is ready. Add a student to track programs, Cove digital card balance, and paid membership status.',
  upgradeBody:
    'Paid members get Cove digital card credit, enrichment discounts, and free refreshments at school events.',
  viewMemberships: 'View paid memberships',

  calendarTitle: 'Calendar & Messages',
  accountTitle: 'My Account',
  studentsTitle: 'My Students',
  storeTitle: 'Store & Cove digital card',
  tabCalendar: 'Calendar',
  tabMessages: 'Messages',
  signOut: 'Sign out',
  refresh: 'Refresh',
  loadError: 'Could not load your portal.',

  calendarEmptyTitle: 'No dates yet',
  calendarEmptyBody:
    'After you enroll a student in a program, session times and school events show up here.',
  calendarEmptyCta: 'Browse programs',
  messagesEmptyTitle: 'Inbox empty',
  messagesEmptyBody:
    'Instructors can send updates here after your student is enrolled: class reminders, location changes, and more.',

  memberSince: 'Member since',
  studentsLabel: 'Students',
  paidMembershipsLabel: 'Paid memberships',
  whatsappHeading: 'Don’t forget to join your grade WhatsApp',

  storeCardsLabel: 'Family Cove digital card',
  storeCardsHint: 'Current Balance',
  recentBuysLabel: 'Recent buys',
  recentBuysHint: 'Payment History',
  ctaLoadCard: 'Load digital card',
  ctaSpiritWear: 'Spirit wear',
  ctaPrograms: 'Programs',
  purchasesEmpty:
    'Purchases from the site (memberships, programs, Cove digital card loads) will list here so you can see what each student is signed up for.',

  addStudentCta: 'Add a student',
  addStudentTitle: 'Add a student',
  firstNameLabel: 'First name',
  lastNameLabel: 'Last name',
  gradeLabel: 'Grade',
  addStudentSubmit: 'Add student',
  cancel: 'Cancel',
  addStudentError: 'Could not add student. Please try again.',
  loadCardHelp:
    'One family Cove digital card and balance. Choose $20 / $40 / $75, or enter any whole dollar amount. Pay with credit/debit card or PayPal. Saving a payment card is optional for faster reloads and auto top off.',
  paymentMethodsTitle: 'How you pay',
  paymentMethodsBody:
    'Snack window: prepaid family Cove digital card (code or QR). Online: pay with credit/debit card or PayPal in this portal (membership, The Cove, and digital card reloads). Saving a payment card is optional.',
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
