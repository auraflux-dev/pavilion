/**
 * Private trial content packs. keyed by organizations.slug.
 * Trial #1: Spring Hill (McLean). Code packs until org CMS tables exist.
 */
import type { PageContentFields } from '@/lib/defaults/page-content'
import type { NavLink } from '@/lib/api/nav'
import type { MembershipTier } from '@/lib/api/membership'
import type { BoardMember } from '@/lib/api/board'
import type { WixEvent } from '@/lib/api/event-model'
import { DEMO_PUBLIC_BRAND_SLUGS } from '@/lib/crm/demo-public-brands'
import { trialHostForSlug } from '@/lib/crm/product-host'

export type TrialBrand = {
  school: string
  pto: string
  short: string
  town: string
  host: string
  store: string
  card: string
  /** Navbar / cheer line, e.g. Be a CHAMPION */
  cheer: string
  /** Public path under /public, e.g. /trial/spring-hill/logo.png */
  logoPath: string
  /** CSS theme tokens. applied via data-pto={slug} */
  colors: {
    primary: string
    dark: string
    accent: string
    warm: string
    soft: string
  }
}

export type TrialPack = {
  slug: string
  brand: TrialBrand
  settings: Record<string, string>
  nav: NavLink[]
  pages: Record<string, PageContentFields>
  tiers: MembershipTier[]
  board: BoardMember[]
  events: WixEvent[]
}

function empty(page: string, partial: Partial<PageContentFields>): PageContentFields {
  return {
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
  }
}

/** Mirrors Membership Toolkit IA (Champion steps, Scoop, $25 join) for a private pitch. */
export function springHillPack(): TrialPack {
  const brand: TrialBrand = {
    school: 'Spring Hill Elementary School',
    pto: 'Spring Hill Elementary PTO',
    short: 'Spring Hill PTO',
    town: 'McLean',
    host: 'spring-hill.onpavilion.com',
    store: 'Spirit Shop',
    card: 'Family card',
    cheer: 'Be a CHAMPION',
    logoPath: '/trial/spring-hill/logo.png',
    // Panthers logo + springhillpto.org: maroon + gold (not Riverside navy).
    colors: {
      primary: '#742b33',
      dark: '#4a1218',
      accent: '#ffd966',
      warm: '#f9f4e8',
      soft: '#f5eef0',
    },
  }
  const b = brand

  return {
    slug: 'spring-hill',
    brand,
    settings: {
      schoolInSession: 'true',
      storeCardBonusPercent: '0',
      presidentEmail: `president@${b.host}`,
      announcementEnabled: 'false',
      contactEmailGeneral: `president@${b.host}`,
      contactEmailTreasurer: `treasurer@${b.host}`,
      contactEmailPrograms: `programs@${b.host}`,
      contactEmailEvents: `events@${b.host}`,
      contactEmailSponsorship: `sponsors@${b.host}`,
      contactAddress: `8201 Lewinsville Road, ${b.town}, VA 22102`,
      portalGrades: 'K,1,2,3,4,5,6',
      // Public Unsplash school/family photos. not Stone Hill campus.
      homeHeroImageTopUrl: '/trial/spring-hill/hero-a.jpg',
      homeHeroImageBottomUrl: '/trial/spring-hill/hero-b.jpg',
      homeHeroImageTopAlt: `${b.school} students learning together`,
      homeHeroImageBottomAlt: `${b.school} classroom energy`,
      homeCommunityImageUrl: '/trial/spring-hill/community.jpg',
      homeCommunityImageAlt: `${b.pto} community`,
      homeVolunteerImageUrl: '/trial/spring-hill/volunteer.jpg',
      homeVolunteerImageAlt: `${b.pto} volunteers`,
    },
    nav: [
      { id: 'sh0', label: 'Home', href: '/', sortOrder: 0, showInNav: true, showInFooter: true, active: true },
      { id: 'sh1', label: 'Events', href: '/events', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
      { id: 'sh2', label: 'Membership', href: '/membership', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
      { id: 'sh3', label: 'Volunteer', href: '/volunteer', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
      { id: 'sh4', label: 'The Scoop', href: '/newsletter', sortOrder: 4, showInNav: true, showInFooter: true, active: true },
      { id: 'sh5', label: 'Board', href: '/board', sortOrder: 5, showInNav: true, showInFooter: true, active: true },
      { id: 'sh6', label: 'Fundraising', href: '/fundraising', sortOrder: 6, showInNav: true, showInFooter: true, active: true },
      { id: 'sh7', label: 'Contact', href: '/contact', sortOrder: 7, showInNav: true, showInFooter: true, active: true },
    ],
    pages: {
      home: empty('home', {
        eyebrow: b.town,
        title: 'Be a CHAMPION for your child',
        body:
          'Three easy steps.\n' +
          '1. Register and add your family.\n' +
          '2. Join the PTO. $25 annually.\n' +
          '3. Subscribe to The Scoop.\n' +
          'Stay in the loop every Wednesday.',
        ctaLabel: 'Join our PTO · $25',
        ctaHref: '/membership',
        sectionTitle: 'Quick links',
        sectionBody: 'Register · Join · Volunteer · The Scoop',
      }),
      'home-community': empty('home-community', {
        title: `${b.pto}\nAdvocate. Programs. Community.`,
      }),
      'home-volunteer': empty('home-volunteer', {
        eyebrow: 'Get involved',
        title: 'Apply to volunteer',
        body:
          `Classroom help, events, and board roles.\n` +
          `All at ${b.school}.`,
        ctaLabel: 'Volunteer openings',
        ctaHref: '/volunteer',
      }),
      membership: empty('membership', {
        eyebrow: 'Join the PTO',
        title: 'Family membership · $25',
        body:
          `Annual family membership funds programs and community events at ${b.school}.\n` +
          'Join once for the school year.\n' +
          'Renew each year.',
        ctaLabel: 'Join our PTO',
        ctaHref: '/membership',
      }),
      events: empty('events', {
        eyebrow: 'This year',
        title: 'PTO events',
        body:
          'Block Party, Book Fair, Fun Fair, Staff Appreciation, and more.\n' +
          `Coordinated by ${b.short}.`,
      }),
      volunteer: empty('volunteer', {
        eyebrow: 'Help',
        title: 'Volunteer at Spring Hill',
        body:
          'Room parents, event shifts, and board interest.\n' +
          'Tell us how you want to help.',
        ctaLabel: 'Sign in to volunteer',
        ctaHref: '/login',
      }),
      board: empty('board', {
        eyebrow: 'Leadership',
        title: 'PTO board',
        body:
          'Executive board and general roles.\n' +
          'Sample roster for this private trial.\n' +
          'Replace with live officers in Staff.',
      }),
      newsletter: empty('newsletter', {
        eyebrow: 'The Scoop',
        title: 'Subscribe to The Scoop',
        body:
          `Weekly Wednesday updates from ${b.short}.\n` +
          'Announcements, events, and ways to help.',
        ctaLabel: 'Stay on The Scoop',
        ctaHref: '/newsletter',
      }),
      fundraising: empty('fundraising', {
        eyebrow: 'Support',
        title: 'Fundraising & matching',
        body:
          `${b.short} is a 501(c)(3).\n` +
          'Direct donations and corporate matching help programs and teachers.\n' +
          'EIN details live with the treasurer for matching-gift forms.',
      }),
      contact: empty('contact', {
        eyebrow: 'Reach us',
        title: 'Contact',
        body:
          `Questions for ${b.short} go to the right officer.\n` +
          'This trial is private.\n' +
          'Forms stay in-app.',
      }),
      meetings: empty('meetings', {
        eyebrow: 'Board',
        title: 'Meetings',
        body:
          'Community meetings and board sessions.\n' +
          'Dates post on Events as the year firms up.',
      }),
      programs: empty('programs', {
        eyebrow: 'Enrichment',
        title: 'Programs',
        body:
          `After-school and enrichment offerings through ${b.short}.\n` +
          'Catalog fills in as the year opens.',
      }),
    },
    tiers: [
      {
        id: 'sh-tier-family',
        tierId: 'reef',
        name: 'Family membership',
        price: 25,
        description: 'Annual family membership for Spring Hill Elementary PTO.',
        perks: ['Supports programs and events', 'Member pricing where offered', 'The Scoop newsletter'],
        popular: true,
        sortOrder: 1,
        active: true,
        giftCardCredit: 0,
        productId: '',
        variantId: '',
      },
    ],
    board: [
      {
        id: 'sh-board-1',
        name: 'President',
        role: 'President',
        email: `president@${b.host}`,
        bio: 'Private trial placeholder. Replace in Staff.',
        photo: null,
        isExec: true,
        sortOrder: 1,
      },
      {
        id: 'sh-board-2',
        name: 'Treasurer',
        role: 'Treasurer',
        email: `treasurer@${b.host}`,
        bio: 'Private trial placeholder. Replace in Staff.',
        photo: null,
        isExec: true,
        sortOrder: 2,
      },
      {
        id: 'sh-board-3',
        name: 'VP Communications',
        role: 'VP Communications',
        email: `comms@${b.host}`,
        bio: 'Owns The Scoop and site updates.',
        photo: null,
        isExec: true,
        sortOrder: 3,
      },
    ],
    events: [
      {
        id: 'sh-ev-1',
        title: 'Open House / Meet the Teachers',
        description: 'Welcome families for the new year at Spring Hill.',
        shortDescription: 'Welcome families for the new year.',
        slug: 'open-house-meet-teachers',
        location: { name: b.school },
        dateAndTimeSettings: {
          startDate: '2026-08-21T22:00:00.000Z',
          endDate: '2026-08-22T00:00:00.000Z',
        },
        tags: ['PTO led'],
      },
      {
        id: 'sh-ev-2',
        title: 'First Day of School',
        description: 'First day of school.',
        shortDescription: 'Cheers & Tears energy. First day.',
        slug: 'first-day-of-school',
        location: { name: b.school },
        dateAndTimeSettings: {
          startDate: '2026-08-24T12:00:00.000Z',
          endDate: '2026-08-24T20:00:00.000Z',
        },
        tags: ['PTO led'],
      },
      {
        id: 'sh-ev-3',
        title: 'Back to School Night',
        description: 'Meet teachers and the PTO board.',
        shortDescription: 'Meet teachers and PTO board.',
        slug: 'back-to-school-night',
        location: { name: b.school },
        dateAndTimeSettings: {
          startDate: '2026-09-04T23:00:00.000Z',
          endDate: '2026-09-05T01:00:00.000Z',
        },
        tags: ['PTO led'],
      },
    ],
  }
}

const PACKS: Record<string, () => TrialPack> = {
  'spring-hill': springHillPack,
  /** Demo / sales preview of an unbranded new trial (not a real prospect pack). */
  vanilla: () =>
    vanillaTrialPack({
      slug: 'vanilla',
      schoolName: 'Your School PTO',
      host: 'demo.onpavilion.com',
    }),
}

export function trialPackForSlug(slug: string): TrialPack | null {
  const key = (slug || '').trim().toLowerCase()
  const build = PACKS[key]
  return build ? build() : null
}

export function knownTrialPackSlugs(): string[] {
  return Object.keys(PACKS)
}

/**
 * Packs offered on the public demo banner / Preview skins UI.
 * Keep Spring Hill (and other real prospect packs) off the public demo.
 */
export function demoPickerPackSlugs(): string[] {
  return [...DEMO_PUBLIC_BRAND_SLUGS]
}

/** Light pack for any new trial that has no named prospect pack yet. */
export function vanillaTrialPack(opts: {
  slug: string
  schoolName: string
  host: string
}): TrialPack {
  const school = opts.schoolName.trim() || 'Your School'
  const short = school.replace(/\s+Elementary.*$/i, '').replace(/\s+PTO$/i, '').trim() || school
  const pto = /PTO|PTA/i.test(school) ? school : `${school} PTO`
  const host = opts.host.trim() || trialHostForSlug(opts.slug)
  const brand: TrialBrand = {
    school,
    pto,
    short,
    town: '',
    host,
    store: 'Store',
    card: 'Family card',
    cheer: 'Welcome',
    logoPath: '',
    colors: {
      // Neutral product shell. Not Riverside green. Not a prospect pack.
      primary: '#1A1A1A',
      dark: '#111111',
      accent: '#5A6070',
      warm: '#F7F7F5',
      soft: '#EEEEEC',
    },
  }
  return {
    slug: opts.slug,
    brand,
    settings: {
      schoolInSession: 'true',
      storeCardBonusPercent: '0',
      presidentEmail: `board@${host}`,
      announcementEnabled: 'false',
      contactEmailGeneral: `board@${host}`,
      portalGrades: 'K,1,2,3,4,5',
    },
    nav: [
      { id: 'v0', label: 'Home', href: '/', sortOrder: 0, showInNav: true, showInFooter: true, active: true },
      { id: 'v1', label: 'Events', href: '/events', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
      { id: 'v2', label: 'Membership', href: '/membership', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
      { id: 'v3', label: 'Volunteer', href: '/volunteer', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
      { id: 'v4', label: 'Contact', href: '/contact', sortOrder: 4, showInNav: true, showInFooter: true, active: true },
    ],
    pages: {
      home: empty('home', {
        eyebrow: 'Your PTO trial',
        title: pto,
        body: 'This is a new Pavilion workspace.\nNo prospect brand pack is applied.\nEdit copy, pages, and programs from Staff.',
        ctaLabel: 'Open membership',
        ctaHref: '/membership',
      }),
    },
    tiers: [],
    board: [],
    events: [],
  }
}
