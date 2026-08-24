/**
 * Code defaults for PageContent stringOverrides (key|text per line in CMS).
 * Edit live in Staff → Page CSS & strings or Page copy bullets.
 */

export const HOME_STRING_DEFAULTS: Record<string, string> = {
  'video.eyebrow': 'New this year',
  'video.title': 'Take a 3-minute website tour',
  'video.body':
    'See how families use shmspto.org for membership, The Cove Digital Card, and more.',
  'donate.compact.title': 'Donate to SHMS PTO',
  'donate.compact.body':
    'Any amount helps the PTO fund enrichment, The Cove, and events for Stone Hill students.',
}

export const PORTAL_NOTICE_DEFAULTS: Record<string, string> = {
  membershipSuccessTitle: 'Membership confirmed. Thank you!',
  membershipSuccessBodyComplete:
    'Your Cove Digital Card and perks are ready below.',
  membershipSuccessBodyPending:
    'Finish confirming your family details so Cove Digital Card credit and your QR attach to your students.',
  whatsappFallbackBody:
    'Join each student’s grade WhatsApp for reminders and PTO updates.',
  calendarHydrating: 'Updating calendar…',
  calendarHydratingBody: 'Programs and events load right after your students.',
  messagesHydrating: 'Updating messages…',
  messagesHydratingBody: 'Instructor notes and newsletters load in a moment.',
  purchasesHydrating: 'Updating purchases…',
  newMessageBanner: 'You have a new message',
  coveLockedLabel: 'Load Cove Digital Card (locked)',
  safetyGateHint: 'Complete student safety profiles before program registration',
}

export const SITE_STRING_DEFAULTS: Record<string, Record<string, string>> = {
  'home-strings': HOME_STRING_DEFAULTS,
  'portal-notices': PORTAL_NOTICE_DEFAULTS,
}
