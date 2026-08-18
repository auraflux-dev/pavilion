import { DEMO_BRAND } from '@/lib/demo/brand'
import type { PageContentFields } from '@/lib/defaults/page-content'
import type { NavLink } from '@/lib/api/nav'
import type { WixEvent } from '@/lib/api/events'
import type { Program } from '@/lib/api/programs'
import type { MembershipTier } from '@/lib/api/membership'
import type { BoardMember } from '@/lib/api/board'
import type { SpiritItem, StoreItem } from '@/lib/api/store'
import type { FAQItem } from '@/lib/api/faq'
import type { MeetingMinute } from '@/lib/api/meetings'
import type { VolunteerOpportunity } from '@/lib/api/volunteers'

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

const b = DEMO_BRAND

export const DEMO_SETTINGS: Record<string, string> = {
  schoolInSession: 'true',
  storeCardBonusPercent: '10',
  heroStatFamilies: '420+',
  heroStatPrograms: '8+',
  heroStatVolunteers: '90+',
  homeCommunityImageAlt: `${b.pto} families at a school night`,
  presidentEmail: `president@${b.host}`,
  announcementEnabled: 'false',
  contactEmailGeneral: `president@${b.host}`,
  contactEmailTreasurer: `treasurer@${b.host}`,
  contactEmailPrograms: `programs@${b.host}`,
  contactEmailEvents: `events@${b.host}`,
  contactEmailSponsorship: `sponsors@${b.host}`,
  contactAddress: `100 Riverside Drive, ${b.town}`,
  contactStoreHours: 'Mon–Fri · lunch periods',
  storeHours: 'Mon–Fri · lunch periods',
  homeVolunteerImageAlt: `${b.pto} volunteers at a school night`,
  homeHeroImageTopUrl: '/demo/hero-a.jpg',
  homeHeroImageBottomUrl: '/demo/hero-b.jpg',
  homeHeroImageTopAlt: `${b.school} students on the playground`,
  homeHeroImageBottomAlt: `${b.school} classroom`,
  homeCommunityImageUrl: '/demo/community.jpg',
  homeVolunteerImageUrl: '/demo/volunteer.jpg',
  portalGrades: 'K,1,2,3,4,5',
}

export const DEMO_NAV: NavLink[] = [
  { id: 'd0', label: 'Home', href: '/', sortOrder: 0, showInNav: true, showInFooter: true, active: true },
  { id: 'd1', label: 'Programs', href: '/programs', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
  { id: 'd2', label: 'Events', href: '/events', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
  { id: 'd3', label: 'Membership', href: '/membership', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
  { id: 'd4', label: b.store, href: '/cove', sortOrder: 4, showInNav: true, showInFooter: true, active: true },
  { id: 'd5', label: 'Volunteer', href: '/volunteer', sortOrder: 5, showInNav: true, showInFooter: true, active: true },
  { id: 'd6', label: 'Fundraising', href: '/fundraising', sortOrder: 6, showInNav: true, showInFooter: true, active: true },
  { id: 'd7', label: 'Board', href: '/board', sortOrder: 7, showInNav: true, showInFooter: true, active: true },
  { id: 'd8', label: 'Meetings', href: '/meetings', sortOrder: 8, showInNav: true, showInFooter: true, active: true },
]

export const DEMO_PAGES: Record<string, PageContentFields> = {
  home: empty('home', {
    eyebrow: `${b.town}`,
    title: `Welcome to ${b.pto}`,
    body: `${b.pto} runs the public site, family portal, and board workspace for ${b.school}. Membership funds enrichment, ${b.store}, and school-year events. ${b.cheer}`,
    ctaLabel: 'Join the PTO',
    ctaHref: '/membership',
  }),
  'home-volunteer': empty('home-volunteer', {
    eyebrow: 'Get involved',
    title: 'Volunteer with us',
    body: `An hour a month still moves the year at ${b.school}. Sign up for events, ${b.store} shifts, or a standing committee.`,
    bullets: [
      'Event setup and checkout',
      `${b.store} window shifts`,
      'Classroom and teacher support',
      'Flexible one-off tasks',
    ],
    ctaLabel: 'See volunteer openings',
    ctaHref: '/volunteer',
    sectionTitle: `Parents keep ${b.school} extra running. The software just holds the list.`,
    sectionBody: `${b.short} volunteer, 2026`,
  }),
  'home-community': empty('home-community', {
    title: `Building community together.\n${b.cheer}`,
  }),
  membership: empty('membership', {
    eyebrow: 'Join the PTO',
    title: 'Family membership',
    body: `Three paid levels. Every dollar stays with ${b.school}: programs, ${b.store} credit, and events.`,
    ctaLabel: 'Become a member',
    ctaHref: '/membership',
  }),
  events: empty('events', {
    eyebrow: 'This year',
    title: 'School events',
    body: `Family nights, fundraisers, and student celebrations on the ${b.short} calendar.`,
  }),
  programs: empty('programs', {
    eyebrow: 'After school',
    title: 'Enrichment programs',
    body: `Clubs and classes run by ${b.short} and parent instructors. Register from your family login.`,
  }),
  volunteer: empty('volunteer', {
    eyebrow: 'Help',
    title: 'Volunteer',
    body: `Pick a shift. ${b.short} tracks signups in Staff so the next board inherits the list.`,
    ctaLabel: 'Create a free account',
    ctaHref: '/auth/join',
  }),
  board: empty('board', {
    eyebrow: `${b.short} officers`,
    title: 'Meet the board',
    body: `A working board: president, treasurer, secretary, and VPs. This roster is sample data for the demo.`,
  }),
  contact: empty('contact', {
    eyebrow: 'Reach us',
    title: 'Contact',
    body: `Questions go to the right officer. In this demo, forms do not send live mail.`,
  }),
  store: empty('store', {
    eyebrow: b.store,
    title: `${b.store} at ${b.school}`,
    body: `Snacks at the window, spirit wear online, and one ${b.card} for the family. Load it, then students tap or show a code.`,
    bullets: [
      'Free parent membership required',
      `One family ${b.card} and balance`,
      '10% on first load · up to $500',
    ],
    ctaLabel: `Load a ${b.card}`,
    ctaHref: '/cove#card',
  }),
  'store-how': empty('store-how', {
    title: `How the ${b.card} works`,
    bullets: [
      `1|Create an account|Free family login. Add students.`,
      `2|Load the ${b.card}|Membership credit lands here. Reloads are 1:1.`,
      `3|Spend at ${b.store}|Window, events, and pickup. One balance.`,
    ],
  }),
  'store-cta': empty('store-cta', {
    title: `Open ${b.store}`,
    body: `Parents load. Students spend. Board sees sales in Staff.`,
    ctaLabel: 'Go to membership',
    ctaHref: '/membership',
  }),
  'spirit-wear': empty('spirit-wear', {
    eyebrow: 'Spirit',
    title: `${b.mascotPlural} gear`,
    body: `Hoodies and tees for ${b.school}. Sample catalog for this demo.`,
  }),
  fundraising: empty('fundraising', {
    eyebrow: 'Give',
    title: 'Fundraising',
    body: `${b.short} tracks goals in one place: membership, ${b.store}, events, and donations.`,
  }),
  meetings: empty('meetings', {
    eyebrow: 'Board',
    title: 'Meetings',
    body: `Monthly board meetings. Minutes live in Staff. This demo shows the page, not live minutes.`,
  }),
  newsletter: empty('newsletter', {
    eyebrow: 'Stay in the loop',
    title: 'Newsletter',
    body: `One list. Officers send from Staff. Signup on this demo does not add you to a live list.`,
  }),
  'member-portal': empty('member-portal', {
    title: 'Family portal',
    body: `Students, membership, ${b.card}, and programs in one login.`,
  }),
  portal: empty('portal', {
    title: 'Your family',
    body: `This demo seeds a sample household so you can click through.`,
  }),
}

export const DEMO_FAQ: FAQItem[] = [
  {
    id: 'demo-faq-member',
    question: `What does ${b.short} membership pay for?`,
    answer: `Programs, ${b.store}, and school-year events. Paid tiers add ${b.card} credit.`,
    page: 'membership',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'demo-faq-card',
    question: `How does the ${b.card} work?`,
    answer: `One family balance. Load online. Students spend at ${b.store} with a code or QR.`,
    page: 'membership',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'demo-faq-volunteer',
    question: 'Do I need a paid membership to volunteer?',
    answer: 'No. A free family login is enough to pick a shift.',
    page: 'volunteer',
    sortOrder: 1,
    active: true,
  },
]

export const DEMO_MEETINGS: MeetingMinute[] = [
  {
    _id: 'demo-mtg-1',
    committee: 'PTO',
    meetingDate: '2026-09-08',
    summary: `${b.short} board meeting. Sample agenda for this demo.`,
    isUpcoming: true,
    published: true,
  },
]

export const DEMO_VOLUNTEER: VolunteerOpportunity[] = [
  {
    _id: 'demo-vol-window',
    title: `${b.store} window`,
    description: `Snack and spirit pickup at ${b.store}.`,
    commitment: 'One lunch period',
    icon: '',
    sortOrder: 1,
    active: true,
  },
  {
    _id: 'demo-vol-event',
    title: 'Event setup',
    description: `Arrive early for Fall Festival and family nights.`,
    commitment: '2 hours',
    icon: '',
    sortOrder: 2,
    active: true,
  },
]

export const DEMO_EVENTS: WixEvent[] = [
  {
    id: 'demo-btsn',
    title: 'Back to School Night',
    description: `Meet teachers, join ${b.short}, and load a ${b.card} at ${b.store}.`,
    slug: 'back-to-school-night',
    location: { name: `${b.school} cafeteria` },
    dateAndTimeSettings: {
      startDate: '2026-09-10T23:00:00.000Z',
      endDate: '2026-09-11T01:00:00.000Z',
    },
    tags: ['PTO led'],
  },
  {
    id: 'demo-fest',
    title: 'Fall Festival',
    description: `Carnival games, food, and a ${b.store} window. Volunteers sign up from the family portal.`,
    slug: 'fall-festival',
    location: { name: `${b.school} blacktop` },
    dateAndTimeSettings: {
      startDate: '2026-10-24T16:00:00.000Z',
      endDate: '2026-10-24T21:00:00.000Z',
    },
    tags: ['PTO led'],
  },
  {
    id: 'demo-skate',
    title: 'Family skate night',
    description: `Rink rental for ${b.school} families. Member ticket discount at checkout.`,
    slug: 'family-skate-night',
    location: { name: 'Fairhaven Skate Center' },
    dateAndTimeSettings: {
      startDate: '2026-11-14T00:00:00.000Z',
      endDate: '2026-11-14T02:00:00.000Z',
    },
    tags: ['PTO led'],
  },
]

export const DEMO_PROGRAMS: Program[] = [
  {
    _id: 'demo-prog-art',
    name: 'After-school art studio',
    description: `Clay, paint, and sketch after school. ${b.short} supplies the room.`,
    fee: 85,
    capacity: 16,
    registrationOpen: true,
    requiresWaiver: true,
    grades: 'K,1,2,3,4,5',
    category: 'Arts',
    featured: true,
    sortOrder: 1,
    dayOfWeek: 'Tuesday',
    classTime: '3:30 to 4:30 PM',
    durationWeeks: 8,
    startDate: '2026-09-22',
    endDate: '2026-11-10',
    schedule: 'Tuesday · 3:30 to 4:30 PM · 8 weeks',
  },
  {
    _id: 'demo-prog-code',
    name: 'Lego builders club',
    description: 'Build and share. Member priority the first week.',
    fee: 40,
    capacity: 20,
    registrationOpen: true,
    requiresWaiver: false,
    grades: 'K,1,2,3,4,5',
    category: 'STEM',
    featured: true,
    sortOrder: 2,
    dayOfWeek: 'Thursday',
    classTime: '3:30 to 4:45 PM',
    durationWeeks: 6,
    startDate: '2026-10-01',
    endDate: '2026-11-12',
    schedule: 'Thursday · 3:30 to 4:45 PM · 6 weeks',
  },
  {
    _id: 'demo-prog-run',
    name: 'Morning running club',
    description: `Track laps before first period. Coaches are ${b.short} parents.`,
    fee: 0,
    capacity: 30,
    registrationOpen: true,
    requiresWaiver: true,
    grades: 'K,1,2,3,4,5',
    category: 'Sports',
    featured: false,
    sortOrder: 3,
    dayOfWeek: 'Mon & Wed',
    classTime: '7:15 to 7:50 AM',
    durationWeeks: 10,
    startDate: '2026-09-14',
    endDate: '2026-11-18',
    schedule: 'Mon & Wed · 7:15 to 7:50 AM · 10 weeks',
  },
]

export const DEMO_TIERS: MembershipTier[] = [
  {
    id: 'demo-reef',
    tierId: 'reef',
    name: b.tiers.reef,
    price: 79,
    description: `Core ${b.short} membership. Funds programs and events.`,
    perks: [`$${20} on the family ${b.card}`, 'Car magnet', 'Member ticket rates'],
    popular: false,
    sortOrder: 1,
    active: true,
    giftCardCredit: 20,
    productId: '',
    variantId: '',
  },
  {
    id: 'demo-lagoon',
    tierId: 'lagoon',
    name: b.tiers.lagoon,
    price: 149,
    description: 'The family plan most households pick.',
    perks: [`$${40} on the family ${b.card}`, 'Spirit shirt', 'Car magnet', 'Member ticket rates'],
    popular: true,
    sortOrder: 2,
    active: true,
    giftCardCredit: 40,
    productId: '',
    variantId: '',
  },
  {
    id: 'demo-tide',
    tierId: 'tide',
    name: b.tiers.tide,
    price: 249,
    description: `Highest credit at ${b.store} plus the same family perks.`,
    perks: [`$${75} on the family ${b.card}`, 'Spirit shirt', 'Car magnet', 'Member ticket rates'],
    popular: false,
    sortOrder: 3,
    active: true,
    giftCardCredit: 75,
    productId: '',
    variantId: '',
  },
]

export const DEMO_BOARD: BoardMember[] = [
  {
    id: 'demo-pres',
    name: 'Priya Shah',
    role: 'President',
    email: `president@${b.host}`,
    bio: `Runs the board calendar and Staff access for ${b.short}.`,
    photo: null,
    isExec: true,
    sortOrder: 1,
  },
  {
    id: 'demo-treas',
    name: 'Marcus Hale',
    role: 'Treasurer',
    email: `treasurer@${b.host}`,
    bio: 'Books, reimbursements, and the year budget in Staff.',
    photo: null,
    isExec: true,
    sortOrder: 2,
  },
  {
    id: 'demo-sec',
    name: 'Elena Ruiz',
    role: 'Secretary',
    email: `secretary@${b.host}`,
    bio: 'Minutes, meetings, and the family newsletter.',
    photo: null,
    isExec: true,
    sortOrder: 3,
  },
  {
    id: 'demo-comm',
    name: 'Jordan Blake',
    role: 'VP Communications',
    email: `comms@${b.host}`,
    bio: 'Site copy, flyers, and the weekly send.',
    photo: null,
    isExec: false,
    sortOrder: 4,
  },
]

export const DEMO_STORE_ITEMS: StoreItem[] = [
  {
    _id: 'demo-snack-1',
    name: 'Pretzel pack',
    brand: b.store,
    description: `Window snack at ${b.store}.`,
    price: 1.5,
    category: 'Snacks',
    inStock: true,
    featured: true,
  },
  {
    _id: 'demo-snack-2',
    name: 'Bottled water',
    brand: b.store,
    description: 'Cold case.',
    price: 1,
    category: 'Drinks',
    inStock: true,
    featured: false,
  },
  {
    _id: 'demo-snack-3',
    name: 'Fruit snacks',
    brand: b.store,
    description: 'After-school pickup.',
    price: 1.25,
    category: 'Candy',
    inStock: true,
    featured: false,
  },
]

export const DEMO_SPIRIT_ITEMS: SpiritItem[] = [
  {
    _id: 'demo-spirit-1',
    name: `${b.mascotPlural} hoodie`,
    price: 42,
    inStock: true,
    slug: 'hawks-hoodie',
  },
  {
    _id: 'demo-spirit-2',
    name: `${b.mascotPlural} tee`,
    price: 22,
    inStock: true,
    slug: 'hawks-tee',
  },
]
