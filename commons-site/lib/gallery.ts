export type GalleryItem = {
  id: string
  title: string
  kind: 'demo' | 'trial' | 'live'
  blurb: string
  href?: string
  imageSrc?: string
  imageAlt?: string
  galleryImages?: { src: string; alt: string }[]
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'riverside',
    title: 'Demo',
    kind: 'demo',
    blurb: 'Public demo board tour.\nSample school brand for prospects.',
    href: 'https://demo.onpavilion.com',
    imageSrc: '/gallery/riverside-public.jpg',
    imageAlt: 'Sample school public homepage',
    galleryImages: [
      {
        src: '/gallery/riverside-member.jpg',
        alt: 'Sample school family membership tiers',
      },
      {
        src: '/gallery/riverside-staff.jpg',
        alt: 'Sample school staff portal home',
      },
    ],
  },
  {
    id: 'trial-slot',
    title: 'Private trial builds',
    kind: 'trial',
    blurb: 'Permissioned screenshots of real trials land here as sales ships them.',
  },
  {
    id: 'live-slot',
    title: 'Live school builds',
    kind: 'live',
    blurb: 'Paid schools with approval appear in this gallery after go-live.',
  },
]

export type WatchItem = {
  id: string
  title: string
  blurb: string
  duration: string
  placeholder: true
}

export const WATCH_ITEMS: WatchItem[] = [
  {
    id: 'overview',
    title: 'Pavilion in five minutes',
    blurb: 'Public site and family login for parents. Staff for the board.',
    duration: 'Coming soon',
    placeholder: true,
  },
  {
    id: 'trial-prune',
    title: 'Prune your trial',
    blurb: 'How a board hides store, spirit, and programs so the trial feels like their PTO.',
    duration: 'Coming soon',
    placeholder: true,
  },
  {
    id: 'billing',
    title: 'Pay and /account',
    blurb: 'How boards pay for Pavilion and manage invoices, separate from school Square sales.',
    duration: 'Coming soon',
    placeholder: true,
  },
]
