/** Public 2026-27 SHMS PTO sponsorship packages. Copy matches the 2026-27 table. */

/** Letter flyer (Membership-style ocean layout). JPG for web; PDF for print. */
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

export const SPONSORSHIP_COMPARE = [
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
] as const
