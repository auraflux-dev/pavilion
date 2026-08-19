/** Public 2026–27 SHMS PTO sponsorship packages. Copy matches the 2026–27 table. */
export type SponsorshipPackageId = 'platinum' | 'gold' | 'silver'

export type SponsorshipPerkGroup = {
  label: string
  items: string[]
}

export type SponsorshipPackage = {
  id: SponsorshipPackageId
  name: string
  price: number
  duration: string
  featured: boolean
  accent: string
  groups: SponsorshipPerkGroup[]
}

const WEBSITE_AND_FACEBOOK = [
  'Logo and link on the PTO website Sponsorship page, Member Portal, and Facebook/Instagram during all events',
  '1 post per month to WhatsApp groups of over 1,000 parents',
  '1 post per month to Facebook and Instagram',
] as const

export const SPONSORSHIP_PACKAGES: SponsorshipPackage[] = [
  {
    id: 'platinum',
    name: 'Platinum',
    price: 2500,
    duration: 'Full Year',
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
        items: [...WEBSITE_AND_FACEBOOK],
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
    duration: 'Half Year',
    featured: false,
    accent: 'var(--brand-green)',
    groups: [
      {
        label: 'Sponsor recognition',
        items: [
          'Logo on banner at 3 events',
          'Logo inclusion on take-home folders',
          'Announced at 3 events',
          'Logo printed on student event tees',
          'Flier distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Website & Facebook',
        items: [...WEBSITE_AND_FACEBOOK],
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
    duration: 'Quarter of Year',
    featured: false,
    accent: '#6B7280',
    groups: [
      {
        label: 'Sponsor recognition',
        items: [
          'Logo on banner at 1 event',
          'Logo inclusion on take-home folders',
          'Announced at 1 event',
          'Logo printed on student event tees',
          'Flier distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Website & Facebook',
        items: [...WEBSITE_AND_FACEBOOK],
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
  { label: 'Website & Facebook', platinum: 'Full Year', gold: 'Half Year', silver: 'Quarter of Year' },
  { label: 'Banner / announced', platinum: 'All events', gold: '3 events', silver: '1 event' },
  { label: 'Newsletters', platinum: 'All PTO and school', gold: '3 monthly', silver: '2 monthly' },
  {
    label: 'Event flyers',
    platinum: 'All in-person flyers with QR',
    gold: '3 (Family Fun Fest, Fall Fest, Back to School Night)',
    silver: '1 (Family Fun Fest, Fall Fest, Back to School Night)',
  },
] as const
