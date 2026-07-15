/**
 * Fallback marketing copy when PageContent CMS row is missing.
 * Keys match PageContent.page (and SiteSettings portal* keys where noted).
 */
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
  membership: empty('membership', {
    eyebrow: 'Join the PTO',
    title: 'PTO Membership',
    body: 'Your membership directly funds enrichment programs, events, and resources that benefit every student at Stone Hill Middle School.',
    sectionTitle: 'Choose Your Membership',
    sectionBody:
      'Start with a free parent account (log in / sign up), then purchase Ruby or Supreme for the 2025–26 school year. Paid tiers include voting rights and member perks in your portal.',
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
      'Thanks for supporting SHMS. Your Ruby/Supreme benefits show on each student card below.',
    title: 'Free parent account',
    body: "You're signed in as a free parent member. Add your students here, then upgrade to Ruby or Supreme anytime for paid benefits.",
    bullets: [
      'Welcome to the SHMS PTO',
      'Your free parent account is ready. Add a student to track programs, store card balance, and paid membership status.',
      "Paid members get a pre-loaded store card, free or discounted program registration, and free refreshments at school events.",
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
