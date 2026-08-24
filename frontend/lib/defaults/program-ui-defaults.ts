/**
 * Program catalog, landing, registration, and contact UI strings.
 * Staff edits under Page CSS & strings → program-strings (key|text).
 */

export const PROGRAM_UI_DEFAULTS: Record<string, string> = {
  // Catalog / filter
  'filter.empty': 'No {season} programs listed yet.\nCheck back soon.',
  'catalog.paidMembersFirst': 'Paid members first',
  'catalog.open': 'Open',
  'catalog.closed': 'Closed',
  'catalog.comingSoon': 'Coming Soon',
  'catalog.registerNow': 'Register Now',
  'catalog.learnMore': 'Learn more',
  'catalog.registrationOpensSoon': 'Registration opens soon',
  'catalog.registrationClosed': 'Registration closed',
  'catalog.spots': '{count} spots',
  'catalog.priorityBanner':
    'Open to paid PTO members only until {until}. Then registration opens to all signed-in parents.',

  // Landing page
  'landing.backLink': 'All programs',
  'landing.classSummary': 'Class summary',
  'landing.instructor': 'Instructor',
  'landing.grades': 'Grades',
  'landing.tuition': 'Tuition',
  'landing.spots': 'Spots',
  'landing.registerNow': 'Register now',
  'landing.registrationOpensSoon': 'Registration opens soon',
  'landing.viewCurriculum': 'View curriculum',
  'landing.hideCurriculum': 'Hide curriculum',
  'landing.copyLink': 'Copy class link',
  'landing.linkCopied': 'Link copied',
  'landing.fallScheduleLink': 'Fall 2026 schedule',
  'landing.springScheduleLink': 'Spring 2027 schedule',
  'landing.curriculumHeading': 'Curriculum',
  'landing.videoUnsupported': 'Your browser does not support embedded video.',
  'landing.noVideoTitle': 'Class video coming soon',
  'landing.noVideoBody':
    'A short intro from the instructor will land here.\nUntil then, use the summary and curriculum on the left.',

  // Spring companion on Fall landing / catalog / checkout (optional add-on)
  'companion.spring.landing.eyebrow': 'Spring 2027',
  'companion.spring.landing.body':
    'Spring is its own semester with a separate landing page.\nSame night and instructor as Fall.\nAdd Spring at Fall checkout, or register Spring later{feeLine}',
  'companion.spring.landing.feeLine': '\n{fee}',
  'companion.spring.landing.link': 'View Spring 2027 class',
  'companion.fall.landing.eyebrow': 'Fall 2026',
  'companion.fall.landing.body':
    'Fall is its own semester with a separate landing page.\nRegister Fall first to add Spring in one checkout{feeLine}',
  'companion.fall.landing.feeLine': '\n{fee}',
  'companion.fall.landing.link': 'View Fall 2026 class',

  // Companion catalog card
  'companion.spring.card.eyebrow': 'Spring 2027',
  'companion.spring.card.body':
    'Full Spring program.\nSame night and instructor.\nAdd at Fall checkout or register Spring on its own{feeLine}',
  'companion.spring.card.feeLine': '\n{fee}',
  'companion.spring.card.link': 'Spring 2027 details',
  'companion.fall.card.eyebrow': 'Fall 2026',
  'companion.fall.card.body':
    'Full Fall program.\nRegister Fall first to bundle Spring at checkout{feeLine}',
  'companion.fall.card.feeLine': '\n{fee}',
  'companion.fall.card.link': 'Fall 2026 details',

  // Companion checkout
  'companion.checkout.fallTitle': 'Registering for Fall',
  'companion.checkout.fallBody':
    'You are on a Spring checkout.\nMost families start on Fall and add Spring here.\n{name}{feeLine}',
  'companion.checkout.fallFeeLine': '\n{fee}',
  'companion.checkout.fallLink': 'Go to Fall 2026 class',
  'companion.checkout.springLabel': 'Also add Spring 2027{feeSuffix}',
  'companion.checkout.springFeeSuffix': ' · {fee}',
  'companion.checkout.springBody':
    '{name}\nOptional add-on.\nSame night.\nOne checkout for Fall and Spring.',

  // Registration form
  'register.heading': 'Register for {name}',
  'register.tuitionTbd': 'Tuition TBD',
  'register.free': 'Free',
  'register.fallPlusSpring': '{total}\nFall + Spring',
  'register.feeOnly': '{total}',
  'register.notOpen': 'Registration is not open yet.',
  'register.priorityBlocked':
    'Paid members only until {until}. Upgrade on Membership, or come back when general registration opens.',
  'register.priorityWindow': 'Paid-member priority window through {until}.',
  'register.loading': 'Loading…',
  'register.viewMemberships': 'View paid memberships',
  'register.addStudent':
    'Add a student in the Member Portal first, including emergency contact and pick-up details.',
  'register.studentLabel': 'Student',
  'register.selectStudent': 'Select a student',
  'register.couponLabel': 'Coupon code (optional)',
  'register.couponPlaceholder': 'Enter code',
  'register.addToCart': 'Add to cart · {total}',
  'register.addToCartNote': 'Added to cart.\nCheck out anytime from the bag icon.',
  'register.payNow': 'Pay now · {total}',
  'register.complete': 'Complete registration',
  'register.checkoutSubtitle': 'Enrichment registration',
  'register.checkoutHeading': 'Checkout',
  'landing.checkoutGate': 'Log in to register',
  'landing.checkoutComingSoonGate': 'Log in so you are ready to checkout',
  'landing.checkoutSignedIn':
    'You are signed in. Checkout opens on the dates above.',
  'register.close': 'Close',
  'register.err.selectStudent': 'Select a student',
  'register.err.consent': 'Please review and accept the required terms',
  'register.err.loadStudents': 'Could not load students',
  'register.err.failed': 'Registration failed',
  'register.success.waitlistExisting':
    'You are already on the waitlist{positionLine}.',
  'register.success.waitlistExistingPosition': ' (position #{position})',
  'register.success.enrolledExisting': 'Already enrolled. You are all set.',
  'register.success.waitlistNew':
    'This program is full. You are{positionLine} on the waitlist. We will email you if a seat opens.',
  'register.success.waitlistPosition': ' #{position}',
  'register.success.enrolled': 'Enrolled in {name}.',
  'register.success.discount':
    '{pct}% membership discount applied.\nList {list} → {amount}.\nComplete payment to enroll.',
  'register.success.paidWaitlist':
    'Payment received. You are{positionLine} on the waitlist. Staff will contact you if a seat opens (refund if needed).',
  'register.success.paidWaitlistPosition': ' #{position}',
  'register.success.paidWaitlistNoPosition':
    'Payment received. You are on the waitlist. Staff will contact you if a seat opens.',
  'register.success.paidEnrolled': 'Enrolled and paid for {name}.',

  // Programs page shell
  'page.listHeading': 'Enrichment by season',
  'page.loadError': 'Unable to load programs right now. Please try again later.',
  'page.emptyList': 'No programs are currently listed. Check back soon!',
  'page.contactTitle': 'Questions about a program?',
  'page.contactIntro':
    'Message Co-VP Fundraising & Programs.\nThe president is copied so your note is not sitting in one inbox alone.',

  // Department contact forms
  'contact.programs.eyebrow': 'VP of Programs',
  'contact.programs.title': 'Ask about a program',
  'contact.programs.intro': 'Questions go to',
  'contact.programs.optionalLabel': 'Program name',
  'contact.programs.optionalPlaceholder':
    'e.g. Robotics, MATHCOUNTS, Young Entrepreneurs, Essay Writing',
  'contact.programs.messagePlaceholder': 'What would you like to know?',
  'contact.programs.submit': 'Send to VP of Programs',
  'contact.programs.success':
    'Thanks. Our VP of Programs will get back to you within one business day during the school year.',
  'contact.events.eyebrow': 'VP of Events',
  'contact.events.title': 'Share an event idea',
  'contact.events.intro': 'Ideas go to',
  'contact.events.optionalLabel': 'Event name or theme',
  'contact.events.optionalPlaceholder': 'e.g. Family Fun Night, Dance Night theme',
  'contact.events.messagePlaceholder':
    'Tell us your idea, preferred timing, and how you might help.',
  'contact.events.submit': 'Send to VP of Events',
  'contact.events.success':
    'Thanks. Our VP of Events will review your idea and follow up within one business day during the school year.',
  'contact.sponsorship.eyebrow': 'VP of Sponsorships',
  'contact.sponsorship.title': 'Become a sponsor',
  'contact.sponsorship.intro': 'Sponsorship requests go to',
  'contact.sponsorship.optionalLabel': 'Business or organization',
  'contact.sponsorship.optionalPlaceholder': 'e.g. Local restaurant, family business',
  'contact.sponsorship.messagePlaceholder':
    'Tell us about your business, how you would like to support SHMS PTO, and the best way to reach you.',
  'contact.sponsorship.submit': 'Send sponsorship request',
  'contact.sponsorship.success':
    'Thanks. Our VP of Sponsorships and the president will review your interest and follow up soon.',
  'contact.nameLabel': 'Your name',
  'contact.emailLabel': 'Email',
  'contact.messageLabel': 'Message',
  'contact.sending': 'Sending…',
  'contact.successTitle': 'Message sent',
  'contact.introSuffix': 'We usually reply within one business day.',
  'contact.optionalSuffix': '(optional)',
  'contact.packageLabel': 'Package of interest',
  'contact.packageNotSure': 'Not sure yet',
  'contact.err.failed': 'Something went wrong. Please try again or email',
}

export type ProgramUiStringScope = 'shared' | 'fall' | 'spring'

export function programUiStringScope(key: string): ProgramUiStringScope {
  if (key.startsWith('companion.fall.') || key.startsWith('companion.checkout.fall')) return 'fall'
  if (key.startsWith('companion.spring.') || key.startsWith('companion.checkout.spring')) return 'spring'
  return 'shared'
}

export const PROGRAM_UI_SHARED_KEYS = Object.keys(PROGRAM_UI_DEFAULTS).filter(
  (key) => programUiStringScope(key) === 'shared',
)
export const PROGRAM_UI_FALL_KEYS = Object.keys(PROGRAM_UI_DEFAULTS).filter(
  (key) => programUiStringScope(key) === 'fall',
)
export const PROGRAM_UI_SPRING_KEYS = Object.keys(PROGRAM_UI_DEFAULTS).filter(
  (key) => programUiStringScope(key) === 'spring',
)
