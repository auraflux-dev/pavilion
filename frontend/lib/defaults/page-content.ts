/**
 * Fallback marketing copy when PageContent CMS row is missing.
 * Keys match PageContent.page (and SiteSettings portal* keys where noted).
 */
import { portalHubBulletsDefault } from '@/lib/defaults/portal-copy'

export type PageContentFields = {
  page: string
  eyebrow: string
  title: string
  body: string
  sectionTitle: string
  sectionBody: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
  /** Optional flyer / hero image URL (staff upload) */
  flyerImage?: string
}

/** PageContent.page keys that power public /cove (retail may edit only these). */
export const COVE_PAGE_CONTENT_KEYS = [
  'store',
  'store-how',
  'store-cta',
  'spirit-wear',
] as const

export function isCovePageContentKey(page: string): boolean {
  return (COVE_PAGE_CONTENT_KEYS as readonly string[]).includes(page)
}

const empty = (page: string, partial: Partial<PageContentFields>): PageContentFields => ({
  page,
  eyebrow: '',
  title: '',
  body: '',
  sectionTitle: '',
  sectionBody: '',
  bullets: [],
  ctaLabel: '',
  ctaHref: '',
  flyerImage: '',
  ...partial,
})

export const PAGE_CONTENT_DEFAULTS: Record<string, PageContentFields> = {
  home: empty('home', {
    eyebrow: 'Ashburn, Virginia',
    title: 'Welcome to Stone Hill Middle School PTO',
    body: 'An active volunteer organization committed to enriching the academic and social experience for all SHMS PTO students and families. Go Stingrays!',
    ctaLabel: 'Join the PTO',
    ctaHref: '/membership',
  }),
  /** Home page block below programs. Wix PageContent page = home-volunteer */
  'home-volunteer': empty('home-volunteer', {
    eyebrow: 'Get Involved',
    title: 'Volunteer With Us',
    body: 'Every hour you volunteer helps create a richer, more vibrant experience for every student at Stone Hill Middle School. Whether you can give an hour a month or a few hours a week, your time makes a real difference.',
    bullets: [
      'Make a direct impact on student enrichment',
      'Connect with other SHMS PTO families',
      'Flexible time commitments for every schedule',
      'Be part of school events and celebrations',
    ],
    ctaLabel: 'Join Today',
    ctaHref: '/volunteer',
    sectionTitle:
      'Volunteering with SHMS PTO has been one of the most rewarding experiences of our family\'s school year.',
    sectionBody: '.  SHMS PTO Parent, 2025 to 2026',
  }),
  /** Home page community strip. Wix PageContent page = home-community */
  'home-community': empty('home-community', {
    title: 'Building community together.\nGo Stingrays!',
    body: '',
  }),
  membership: empty('membership', {
    eyebrow: 'Join the PTO',
    title: 'PTO Membership',
    body: 'Your membership directly funds enrichment programs, events, and resources that benefit every student at Stone Hill Middle School.',
    sectionTitle: 'Choose Your Membership',
    sectionBody:
      'Start with a free parent account (log in / sign up), then choose Reef, Lagoon, or Tide for the school year. Paid tiers unlock PTO card credit and member perks in your portal.',
  }),
  events: empty('events', {
    eyebrow: 'Mark Your Calendar',
    title: 'Upcoming Events',
    body: 'Stay connected with everything happening at Stone Hill Middle School: meetings, celebrations, competitions, and more.',
  }),
  programs: empty('programs', {
    eyebrow: 'Student Enrichment',
    title: 'Enrichment Programs',
    body: 'PTO-funded programs designed to challenge, inspire, and connect students beyond the standard curriculum.',
  }),
  volunteer: empty('volunteer', {
    eyebrow: 'Get Involved',
    title: 'Volunteer With Us',
    body: 'Every hour you give helps create a richer experience for every student at Stone Hill Middle School.',
  }),
  board: empty('board', {
    eyebrow: 'SHMS PTO Board',
    title: 'Meet the Board',
    body: 'Your SHMS PTO is run entirely by parent volunteers. Every event, program, and fundraiser starts here.',
  }),
  contact: empty('contact', {
    eyebrow: 'Get in Touch',
    title: 'Contact the PTO',
    body: "Questions about programs, The Cove, volunteering, or membership? We'll get back to you within one business day.",
    sectionTitle: 'About the PTO Board',
    sectionBody:
      'The SHMS PTO is run entirely by parent volunteers. We try to respond to all messages within one business day during the school year.',
  }),
  store: empty('store', {
    eyebrow: 'The Cove',
    title: 'Become a free member, then load a Cove Digital Card.',
    body: '',
    bullets: [
      'Free parent membership required',
      '10% bonus on first load (not reloads)',
      'Load any amount up to $500',
    ],
    sectionTitle: '',
    sectionBody: '',
  }),
  'store-how': empty('store-how', {
    bullets: [
      '1|Become a free member|Create a free parent account, then choose an amount and pay online with card or PayPal.',
      '2|First load gets 10% extra|Pay $20, get $22 on first load or membership credit. Reloads are dollar for dollar.',
      '3|Spend at The Cove|Students show the Cove Digital Card code or QR from the member portal.',
    ],
  }),
  'store-cta': empty('store-cta', {
    eyebrow: 'Cove Digital Card · Members',
    title: 'Free member? First load gets 10% extra.',
    body: 'One family Cove Digital Card and balance (up to $500 per load). 10% on first load or membership credit; reloads 1:1. Students spend with the code or QR at The Cove window.',
  }),
  'spirit-wear': empty('spirit-wear', {
    eyebrow: 'The Cove · Shop',
    title: 'Spirit wear & merchandise',
    body: 'Show your Stingrays pride. Order online year round. Pick up at school when the window is open.',
  }),
  fundraising: empty('fundraising', {
    eyebrow: 'Goals · Live',
    title: 'Fundraising Tracker',
    body: 'Membership, The Cove, and event purchases count here automatically.',
  }),
  meetings: empty('meetings', {
    eyebrow: 'Transparency & Communication',
    title: 'Meetings & Minutes',
    body: "Stay informed on what's happening at Stone Hill Middle School. View upcoming meetings, join live, and read past minutes from PTO and advisory committees.",
  }),
  newsletter: empty('newsletter', {
    eyebrow: 'Stay Connected',
    title: 'SHMS PTO Newsletter',
    body: 'Stay in the loop on everything happening at Stone Hill Middle School, delivered straight to your inbox.',
  }),
  'member-portal': empty('member-portal', {
    title: 'Member Portal',
    body: 'Your Cove Digital Card balance, membership, and quick links, all in one place.',
  }),
  portal: empty('portal', {
    sectionTitle: 'Paid PTO membership active',
    sectionBody:
      'Thanks for supporting SHMS PTO. Your paid membership benefits show on each student card below.',
    title: 'Free parent account',
    body: "You're signed in as a free parent member. Add your students here, then upgrade to Reef, Lagoon, or Tide anytime for paid benefits.",
    bullets: [
      'Welcome to the SHMS PTO',
      'Your free parent account is ready. Add a student to track programs, Cove Digital Card balance, and paid membership status.',
      'Paid members get Cove Digital Card credit, enrichment discounts, and free refreshments at school events.',
    ],
  }),
  /** key|text lines. See lib/defaults/portal-copy.ts */
  'portal-hub': empty('portal-hub', {
    title: 'Member portal UI labels',
    body: 'Keyed bullets (key|text) drive portal quadrant titles, empty states, and CTAs.',
    bullets: portalHubBulletsDefault().split('\n'),
  }),
  /** question|answer lines. Shown only inside /member-portal (full parent docs, not one-liners) */
  'portal-help': empty('portal-help', {
    title: 'Portal help',
    body: 'Parent guides. Member portal only.',
    bullets: [
      'How do I update My Account?|Open My Account and choose Edit profile. You can update your display name and phone number here.\n\nYour sign-in email is your Wix login identity (often Google). Parents cannot change that email in the portal. Email vp-membershipexperience@shmspto.org if you need help with the login email.',
      'How do I add another student?|Scroll to My Students and choose Add a student. Enter first name, last name, and grade (6, 7, or 8).\n\nAdd every student in your household so programs, The Cove balance, and messages stay tied to the right kids.',
      'How do I fix a student name or grade?|Open the student card, choose Edit student, make your changes, and save. Updates usually show within a few minutes. Refresh the portal if you still see the old info.',
      'Am I free or paid?|My Account shows Free parent account or Paid PTO membership.\n\nFree means you can log in, add students, shop The Cove, and load a family Cove Digital Card. Paid means you purchased Reef, Lagoon, or Tide for the school year. Perks and digital card credit sync after checkout.',
      'What are Reef, Lagoon, and Tide?|Those are the paid PTO membership levels for the school year. Each tier includes different Cove Digital Card credit and member perks.\n\nStart free anytime, then upgrade from Membership when you are ready. Lagoon and Tide ask for Spirit Wear T-shirt size at checkout so we can fulfill your shirt. After payment, refresh the portal so your tier and credit appear.',
      'How do I join or upgrade membership?|Go to Membership (or Upgrade in this portal), pick Reef, Lagoon, or Tide, and complete checkout with card or PayPal.\n\nWhen payment clears, return here and refresh. If credit or tier is still missing after a few minutes, email vp-membershipexperience@shmspto.org with your receipt.',
      'Where is my Cove Digital Card credit?|Open Store & Cove Digital Card. Your family balance and recent purchases show there.\n\nMembership credit loads after purchase. Use Load Cove Digital Card anytime to add more. First-load bonus (when offered) applies once; reloads are dollar-for-dollar.',
 'What is the family Cove Digital Card?|In the member portal, Save the QR to Photos (or Wallet). That QR is the Square gift-card number. Square Stand / iPad at Cove and events scan it like a plastic card. Students do not need to remember a code.\n\nA 6-digit spoken backup still appears if the phone dies. Staff can type that code on the Cove register.\n\nLoad balance online first so the QR works at Stand.',
      'How does The Cove snack window work?|Online checkout creates the family Square digital card balance and Cove code/QR. Staff look up by code at the register and tap products to charge.\n\nGuests without a portal login buy spirit wear or event merch on Square Stand with staff (card present). Spirit wear and other Cove merch also checkout online with card or PayPal.',
      'Do paid members get Cove coupons?|Often yes. When you are signed in as a paid member, look for the coupon bar on The Cove shop or checkout.\n\nIf a code fails, wait a minute, refresh, and try again, or email vp-membershipexperience@shmspto.org.',
      'Can I pay with a credit card or PayPal?|Yes. Free and paid parents can pay with credit/debit (Square) or PayPal for membership, The Cove, and digital card reloads.\n\nSaving a payment card is optional for faster reloads. SHMS PTO never receives your full card number.',
      'Where do surveys appear?|Active surveys list under Surveys for you on this portal. You will get the same branded form by email, text, or WhatsApp. Always on shmspto.org, never an outside link.',
      'Can I remove a student from my account?|Parents can add and edit students. To archive or remove a student, email vp-membershipexperience@shmspto.org so staff can update the record safely.',
    ],
  }),
}

/** Contact detail fallbacks (SiteSettings keys preferred). */
export const CONTACT_DEFAULTS = {
 /** info@ is not provisioned yet. use president until aliases exist */
  contactEmailGeneral: 'president@shmspto.org',
  contactEmailTreasurer: 'treasurer@shmspto.org',
 /** Programs inbox shares Initiatives alias until vp-programs@ exists */
  contactEmailPrograms: 'vp-initiatives@shmspto.org',
  contactEmailEvents: 'vp-events@shmspto.org',
  contactEmailSponsorship: 'vp-initiatives@shmspto.org',
  contactAddress: '23415 Evergreen Ridge Drive, Ashburn, VA 20148',
  contactStoreHours: 'Mon. Fri · lunch periods (in person only)',
  portalGrades: '6,7,8',
}
