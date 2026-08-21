/** Public sponsorship packages. Stone Hill table + Pavilion demo catalog. */

import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

/** Letter flyer (Membership-style ocean layout). JPG for web; PDF for print. SHMS only. */
export const SPONSORSHIP_FLYER_JPG_URL = '/fundraising/sponsorship-packages-2026-27.jpg'
export const SPONSORSHIP_FLYER_PDF_URL = '/fundraising/sponsorship-packages-2026-27.pdf'

export type SponsorshipPackageId = 'platinum' | 'gold' | 'silver'

export type SponsorshipPerkGroup = {
  label: string
  items: string[]
}

export type SponsorshipPackage = {
  id: SponsorshipPackageId
  name: string
  price: number
  featured: boolean
  accent: string
  groups: SponsorshipPerkGroup[]
}

export type SponsorshipCompareRow = {
  label: string
  platinum: string
  gold: string
  silver: string
}

function websiteAndFacebook(promotion: string) {
  return [
    `${promotion}: logo and link on the PTO website Sponsorship page, Member Portal, and Facebook/Instagram during all events`,
    '1 post per month to WhatsApp groups of over 1,000 parents',
    '1 post per month to Facebook and Instagram',
  ]
}

export const SPONSORSHIP_PACKAGES: SponsorshipPackage[] = [
  {
    id: 'platinum',
    name: 'Platinum',
    price: 2500,
    featured: true,
    accent: '#C9A800',
    groups: [
      {
        label: 'Sponsor recognition',
        items: [
          'Logo on banner at all events',
          'Announced at all events',
          'Inclusion on all flyers',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Website & Facebook',
        items: websiteAndFacebook('Full Year Promotion'),
      },
      {
        label: 'Newsletter & event ads',
        items: [
          'Mention in all PTO and school newsletters',
          'Flyers for in-person events with QR',
          'Any marketing material',
        ],
      },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 1500,
    featured: false,
    accent: 'var(--brand-green)',
    groups: [
      {
        label: 'Sponsor recognition',
        items: [
          'Logo on banner at 3 events',
          'Announced at 3 events',
          'Flyer distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Website & Facebook',
        items: websiteAndFacebook('Half Year Promotion'),
      },
      {
        label: 'Newsletter & event ads',
        items: [
          'Mention in 3 monthly newsletters',
          '3 event flyers (including Family Fun Fest, Fall Fest, Back to School Night)',
        ],
      },
    ],
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 500,
    featured: false,
    accent: '#6B7280',
    groups: [
      {
        label: 'Sponsor recognition',
        items: [
          'Logo on banner at 1 event',
          'Announced at 1 event',
          'Flyer distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Website & Facebook',
        items: websiteAndFacebook('Quarter of Year Promotion'),
      },
      {
        label: 'Newsletter & event ads',
        items: [
          'Mention in 2 monthly newsletters',
          '1 event flyer (including Family Fun Fest, Fall Fest, Back to School Night)',
        ],
      },
    ],
  },
]

export const SPONSORSHIP_COMPARE: SponsorshipCompareRow[] = [
  {
    label: 'Website promotion',
    platinum: 'Full year',
    gold: 'Half year',
    silver: 'Quarter of the year',
  },
  { label: 'Banner / announced', platinum: 'All events', gold: '3 events', silver: '1 event' },
  { label: 'Newsletters', platinum: 'All PTO and school', gold: '3 monthly', silver: '2 monthly' },
  {
    label: 'Event flyers',
    platinum: 'All in-person flyers with QR',
    gold: '3 (Family Fun Fest, Fall Fest, Back to School Night)',
    silver: '1 (Family Fun Fest, Fall Fest, Back to School Night)',
  },
]

/**
 * Pavilion demo catalog. Different prices, names, and perks than Stone Hill.
 * Ids stay platinum/gold/silver so the compare table columns still line up.
 */
const DEMO_SPONSORSHIP_PACKAGES: SponsorshipPackage[] = [
  {
    id: 'platinum',
    name: 'Campus Partner',
    price: 2000,
    featured: true,
    accent: '#C9A800',
    groups: [
      {
        label: 'On campus',
        items: [
          `Logo on the year banner at every ${DEMO_BRAND.short} community night`,
          'Thank-you from the mic at each of those nights',
          `Window card at ${DEMO_BRAND.store} for the full school year`,
          'Framed partner certificate',
        ],
      },
      {
        label: 'Online',
        items: [
          `Logo and link on the ${DEMO_BRAND.short} Sponsorship page and family portal all year`,
          'One social thank-you post each month',
          'Listed in every family email blast',
        ],
      },
      {
        label: 'Print',
        items: [
          'Logo on all community-night flyers with QR',
          `Mention in the ${DEMO_BRAND.district} family newsletter when space allows`,
        ],
      },
    ],
  },
  {
    id: 'gold',
    name: 'Neighborhood Partner',
    price: 750,
    featured: false,
    accent: 'var(--brand-green)',
    groups: [
      {
        label: 'On campus',
        items: [
          'Logo on the banner at four community nights',
          'Thank-you from the mic at those four nights',
          'Framed partner certificate',
        ],
      },
      {
        label: 'Online',
        items: [
          `Logo on the Sponsorship page for half the school year`,
          'Four social thank-you posts (one per featured night)',
          'Listed in four family email blasts',
        ],
      },
      {
        label: 'Print',
        items: [
          'Logo on four community-night flyers',
          'Spring Carnival, Book Fair Night, Field Day, and Winter Concert',
        ],
      },
    ],
  },
  {
    id: 'silver',
    name: 'Friend of the PTO',
    price: 250,
    featured: false,
    accent: '#6B7280',
    groups: [
      {
        label: 'On campus',
        items: [
          'Logo on the banner at one community night of your choice',
          'Thank-you from the mic that night',
          'Framed partner certificate',
        ],
      },
      {
        label: 'Online',
        items: [
          `Logo on the Sponsorship page for one quarter`,
          'One social thank-you post',
          'Listed in two family email blasts',
        ],
      },
      {
        label: 'Print',
        items: ["Logo on that night's flyer"],
      },
    ],
  },
]

const DEMO_SPONSORSHIP_COMPARE: SponsorshipCompareRow[] = [
  {
    label: 'Website listing',
    platinum: 'Full year',
    gold: 'Half year',
    silver: 'One quarter',
  },
  {
    label: 'Community nights',
    platinum: 'All nights',
    gold: 'Four nights',
    silver: 'One night',
  },
  {
    label: 'Family email blasts',
    platinum: 'Every blast',
    gold: 'Four blasts',
    silver: 'Two blasts',
  },
  {
    label: 'Store window',
    platinum: `Year card at ${DEMO_BRAND.store}`,
    gold: 'Not included',
    silver: 'Not included',
  },
]

export function getSponsorshipPackages(): SponsorshipPackage[] {
  return isDemoInstance() ? DEMO_SPONSORSHIP_PACKAGES : SPONSORSHIP_PACKAGES
}

export function getSponsorshipCompare(): SponsorshipCompareRow[] {
  return isDemoInstance() ? DEMO_SPONSORSHIP_COMPARE : SPONSORSHIP_COMPARE
}

export function showSponsorshipFlyerDownload(): boolean {
  return !isDemoInstance()
}

export function sponsorshipIntroCopy(): string {
  if (isDemoInstance()) {
    return (
      'One payment for the 2026-27 school year.\n' +
      'Choose Campus Partner, Neighborhood Partner, or Friend of the PTO.'
    )
  }
  return 'One payment for the 2026-27 school year.\nChoose Platinum, Gold, or Silver below.'
}

export function sponsorshipFooterCopy(): string {
  if (isDemoInstance()) {
    return (
      `Each package is one payment for the 2026-27 school year. ` +
      `Gifts support ${DEMO_BRAND.pto} (sample 501(c)(3) for this demo), not ${DEMO_BRAND.district}.`
    )
  }
  return (
    'Each package is one payment for the 2026-27 school year. Full Year, Half Year, and Quarter of Year Promotion is how long your logo is listed on the website and portal. Gifts support SHMS PTO (501(c)(3)), not Loudoun County Public Schools.'
  )
}

export function sponsorshipEmptySponsorsCopy(): string {
  if (isDemoInstance()) {
    return `Future partners will appear here. Be the first to sponsor ${DEMO_BRAND.short}.`
  }
  return 'Future sponsors will appear here. Be the first to partner with SHMS PTO.'
}

export function sponsorshipInitiativeBlurb(): string {
  if (isDemoInstance()) {
    return (
      `Campus Partner $2,000, Neighborhood Partner $750, or Friend of the PTO $250. ` +
      'One payment for the 2026-27 school year.'
    )
  }
  return 'Platinum $2,500, Gold $1,500, or Silver $500. One payment for the 2026-27 school year.'
}

export type SponsorshipPackageOption = { value: string; label: string }

/** Client-safe when `forDemo` matches `isPublicDemoInstance()`. */
export function sponsorshipPackageSelectOptions(
  forDemo = false,
): SponsorshipPackageOption[] {
  if (forDemo) {
    return [
      { value: 'Campus Partner: $2,000', label: 'Campus Partner: $2,000' },
      { value: 'Neighborhood Partner: $750', label: 'Neighborhood Partner: $750' },
      { value: 'Friend of the PTO: $250', label: 'Friend of the PTO: $250' },
    ]
  }
  return [
    { value: 'Platinum: $2,500', label: 'Platinum: $2,500' },
    { value: 'Gold: $1,500', label: 'Gold: $1,500' },
    { value: 'Silver: $500', label: 'Silver: $500' },
  ]
}
