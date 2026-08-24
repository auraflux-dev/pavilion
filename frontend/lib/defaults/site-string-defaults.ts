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

import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'
import { STAFF_PORTAL_DEFAULTS } from '@/lib/defaults/staff-portal-defaults'
import {
  CURRICULUM_PAGE_DEFAULTS,
  DONATE_FORM_DEFAULTS,
  LEGAL_SHELL_DEFAULTS,
  RFC_DEFAULTS,
  SURVEY_DEFAULTS,
  VISITOR_VIDEO_DEFAULTS,
} from '@/lib/defaults/visitor-string-defaults'

export const SITE_STRING_DEFAULTS: Record<string, Record<string, string>> = {
  'home-strings': HOME_STRING_DEFAULTS,
  'portal-notices': PORTAL_NOTICE_DEFAULTS,
  'portal-forms': PORTAL_FORM_DEFAULTS,
  'staff-portal': STAFF_PORTAL_DEFAULTS,
  'programs-curriculum': CURRICULUM_PAGE_DEFAULTS,
  'visitor-videos': VISITOR_VIDEO_DEFAULTS,
  'donate-form': DONATE_FORM_DEFAULTS,
  'rfc-promo': RFC_DEFAULTS,
  'legal-shell': LEGAL_SHELL_DEFAULTS,
  'survey-strings': SURVEY_DEFAULTS,
}
