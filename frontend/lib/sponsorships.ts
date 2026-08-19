/** Public 2026–27 SHMS PTO sponsorship packages. */
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
  summary: string
  groups: SponsorshipPerkGroup[]
}

export const SPONSORSHIP_PACKAGES: SponsorshipPackage[] = [
  {
    id: 'platinum',
    name: 'Platinum',
    price: 2500,
    duration: 'Full school year',
    featured: true,
    accent: '#C9A800',
    summary: 'Premier partner at every event and in every parent channel.',
    groups: [
      {
        label: 'On site',
        items: [
          'Logo on the banner at every PTO event',
          'Announced at every event',
          'Logo on all flyers and student-facing print',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Digital',
        items: [
          'Logo and link on the Sponsorship page and Member Portal for the full year',
          'Facebook and Instagram during every event',
          'One post each month to WhatsApp groups of 1,000+ parents',
          'One post each month on Facebook and Instagram',
        ],
      },
      {
        label: 'Print & newsletter',
        items: [
          'Mention in every PTO and school newsletter',
          'QR on in-person event flyers',
          'Inclusion on PTO marketing materials',
        ],
      },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 1500,
    duration: 'Half year',
    featured: false,
    accent: 'var(--brand-green)',
    summary: 'High-visibility partner across our three flagship family events.',
    groups: [
      {
        label: 'On site',
        items: [
          'Logo on the banner at 3 events',
          'Announced at 3 events',
          'Logo on take-home folders',
          'Logo on student event tees',
          'Flyer distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Digital',
        items: [
          'Logo and link on the Sponsorship page and Member Portal for half the year',
          'Facebook and Instagram during every event',
          'One post each month to WhatsApp groups of 1,000+ parents',
          'One post each month on Facebook and Instagram',
        ],
      },
      {
        label: 'Print & newsletter',
        items: [
          'Mention in 3 monthly newsletters',
          'Three event flyers (Family Fun Fest, Fall Fest, Back to School Night)',
        ],
      },
    ],
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 500,
    duration: 'One quarter',
    featured: false,
    accent: '#6B7280',
    summary: 'A focused season of recognition at school and online.',
    groups: [
      {
        label: 'On site',
        items: [
          'Logo on the banner at 1 event',
          'Announced at 1 event',
          'Logo on take-home folders',
          'Logo on student event tees',
          'Flyer distribution at events',
          'Frameable participation certificate',
        ],
      },
      {
        label: 'Digital',
        items: [
          'Logo and link on the Sponsorship page and Member Portal for one quarter',
          'Facebook and Instagram during every event',
          'One post each month to WhatsApp groups of 1,000+ parents',
          'One post each month on Facebook and Instagram',
        ],
      },
      {
        label: 'Print & newsletter',
        items: [
          'Mention in 2 monthly newsletters',
          'One event flyer (Family Fun Fest, Fall Fest, or Back to School Night)',
        ],
      },
    ],
  },
]

export const SPONSORSHIP_COMPARE = [
  { label: 'Digital presence', platinum: 'Full year', gold: 'Half year', silver: 'One quarter' },
  { label: 'Event banner', platinum: 'Every event', gold: '3 events', silver: '1 event' },
  { label: 'Announced on stage', platinum: 'Every event', gold: '3 events', silver: '1 event' },
  { label: 'Newsletters', platinum: 'All year', gold: '3 issues', silver: '2 issues' },
  { label: 'Event flyers', platinum: 'All flyers', gold: '3 flagship events', silver: '1 flagship event' },
] as const
