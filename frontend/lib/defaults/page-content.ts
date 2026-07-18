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
  ...partial,
})

export const PAGE_CONTENT_DEFAULTS: Record<string, PageContentFields> = {
  home: empty('home', {
    eyebrow: 'Ashburn, Virginia · LCPS',
    title: 'Welcome to Stone Hill Middle School PTO',
    body: 'An active volunteer organization committed to enriching the academic and social experience for all SHMS students and families. Go Stingrays!',
    ctaLabel: 'Join the PTO',
    ctaHref: '/membership',
  }),
  /** Home page block below programs — Wix PageContent page = home-volunteer */
  'home-volunteer': empty('home-volunteer', {
    eyebrow: 'Get Involved',
    title: 'Volunteer With Us',
    body: 'Every hour you volunteer helps create a richer, more vibrant experience for every student at Stone Hill Middle School. Whether you can give an hour a month or a few hours a week, your time makes a real difference.',
    bullets: [
      'Make a direct impact on student enrichment',
      'Connect with other SHMS families',
      'Flexible time commitments for every schedule',
      'Be part of school events and celebrations',
    ],
    ctaLabel: 'Join Today',
    ctaHref: '/volunteer',
    sectionTitle:
      'Volunteering with SHMS PTO has been one of the most rewarding experiences of our family\'s school year.',
    sectionBody: '— SHMS Parent, 2025–2026',
  }),
  /** Home page community strip — Wix PageContent page = home-community */
  'home-community': empty('home-community', {
    title: 'Building community together — Go Stingrays!',
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
    body: 'Stay connected with everything happening at Stone Hill Middle School — meetings, celebrations, competitions, and more.',
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
    eyebrow: '2025–26 School Year',
    title: 'Meet the Board',
    body: 'Your SHMS PTO is run entirely by parent volunteers. Every event, program, and fundraiser starts here.',
  }),
  contact: empty('contact', {
    eyebrow: 'Get in Touch',
    title: 'Contact the PTO',
    body: "Questions about programs, the school store, volunteering, or membership? We'll get back to you within one business day.",
    sectionTitle: 'About the PTO Board',
    sectionBody:
      'The SHMS PTO is run entirely by parent volunteers. We try to respond to all messages within one business day during the school year.',
  }),
  store: empty('store', {
    eyebrow: 'SHMS Store Card',
    title: 'Load a card, your student handles the rest.',
    body: '',
    bullets: ['No cash needed', 'Reload anytime online', 'Funds never expire'],
    sectionTitle: '',
    sectionBody: '',
  }),
  'store-how': empty('store-how', {
    bullets: [
      '1|Parent loads the card|Choose an amount and pay securely online — card or Apple Pay.',
      '2|Student uses their card|The balance is on the physical store card your student carries.',
      '3|Tap & go at the window|Cashier taps the card at the PTO store reader — done.',
    ],
  }),
  'store-cta': empty('store-cta', {
    eyebrow: 'Store Card',
    title: "Ready to load your student's card?",
    body: 'Most students spend $20–$40 per month. Load online, student taps their card at the window. Funds never expire.',
  }),
  'spirit-wear': empty('spirit-wear', {
    eyebrow: 'Spirit Wear',
    title: 'Stingrays Pride',
    body: 'Show your school spirit. All items available year-round — order online and pick up at school.',
  }),
  fundraising: empty('fundraising', {
    eyebrow: '2025–26 School Year · Live',
    title: 'Fundraising Tracker',
    body: 'Every Wix purchase — online or in-store — counts here automatically.',
  }),
  meetings: empty('meetings', {
    eyebrow: 'Transparency & Communication',
    title: 'Meetings & Minutes',
    body: "Stay informed on what's happening at Stone Hill Middle School. View upcoming meetings, join live, and read past minutes from PTO and advisory committees.",
  }),
  newsletter: empty('newsletter', {
    eyebrow: 'Stay Connected',
    title: 'SHMS PTO Newsletter',
    body: 'Stay in the loop on everything happening at Stone Hill Middle School — delivered straight to your inbox.',
  }),
  'member-portal': empty('member-portal', {
    title: 'Member Portal',
    body: 'Your store card balance, membership, and quick links — all in one place.',
  }),
  portal: empty('portal', {
    sectionTitle: 'Paid PTO membership active',
    sectionBody:
      'Thanks for supporting SHMS. Your paid membership benefits show on each student card below.',
    title: 'Free parent account',
    body: "You're signed in as a free parent member. Add your students here, then upgrade to Reef, Lagoon, or Tide anytime for paid benefits.",
    bullets: [
      'Welcome to the SHMS PTO',
      'Your free parent account is ready. Add a student to track programs, store card balance, and paid membership status.',
      'Paid members get a pre-loaded store card, free or discounted program registration, and free refreshments at school events.',
    ],
  }),
  /** key|text lines — see lib/defaults/portal-copy.ts */
  'portal-hub': empty('portal-hub', {
    title: 'Member portal UI labels',
    body: 'Keyed bullets (key|text) drive portal quadrant titles, empty states, and CTAs.',
    bullets: portalHubBulletsDefault().split('\n'),
  }),
  /** question|answer lines — shown only inside /member-portal */
  'portal-help': empty('portal-help', {
    title: 'Portal help',
    body: 'Parent FAQ — member portal only.',
    bullets: [
      'How do I update My Account?|Click Edit profile in My Account. You can change your name and phone here. Email changes go through the PTO treasurer.',
      'How do I add another student?|Scroll to My Students and tap Add a student at the bottom. Enter first name, last name, and grade.',
      'How do I fix a student name or grade?|Open the student card (tap the arrow), then Edit student. Save — changes appear within a few minutes.',
      'What are Reef, Lagoon, and Tide?|Those are the paid PTO membership levels on the website. Free accounts can upgrade anytime from Membership / Upgrade. Paid members see their tier in the portal after checkout syncs.',
      'How do I join or upgrade membership?|Open Membership (or Upgrade in this portal), pick Reef, Lagoon, or Tide, and complete checkout. After payment, refresh the portal — your tier and store-card credit appear once sync finishes.',
      'I am a paid member — where is my store card credit?|Store & Purchases on this portal shows balances. Membership gift-card credit loads after purchase (refresh if it is still catching up). Use Load card anytime to add more.',
      'Do paid members get Spirit Wear coupons?|Often yes — when signed in as a paid member, look for the coupon bar on Spirit Wear / checkout. If a code fails, wait a minute and refresh, or email membership@shmspto.org.',
      'How do I reload the store card?|In Store & Purchases, tap Load card. Choose $10, $20, or $25 and pay securely. Balance updates on the student card after purchase.',
      'Do I need a store card?|The snack window uses a prepaid store card. Memberships and spirit wear pay online at checkout — no store card required.',
      'Can I save a payment card?|Yes. During a reload, choose Save this card. Square securely stores it; SHMS PTO never receives the card number. You can remove it anytime.',
      'Where do surveys appear?|Active surveys list below your quadrants. Same branded form we send by email, text, or WhatsApp — always on shmspto.org.',
    ],
  }),
}

/** Contact detail fallbacks (SiteSettings keys preferred). */
export const CONTACT_DEFAULTS = {
  contactEmailGeneral: 'info@shmspto.org',
  contactEmailTreasurer: 'treasurer@shmspto.org',
  contactAddress: '23415 Evergreen Ridge Drive, Ashburn, VA 20148',
  contactStoreHours: 'Open during lunch periods, Mon–Fri',
  portalGrades: '6,7,8',
}
