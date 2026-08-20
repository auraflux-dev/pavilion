export type GalleryItem = {
  id: string
  title: string
  kind: 'demo' | 'trial' | 'live'
  blurb: string
  href?: string
  placeholder: true
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'riverside',
    title: 'Riverside demo',
    kind: 'demo',
    blurb: 'Public demo board tour. Vanilla school brand for prospects.',
    href: 'https://commons-pto-demo.vercel.app/review?code=riverside-board',
    placeholder: true,
  },
  {
    id: 'trial-slot',
    title: 'Private trial builds',
    kind: 'trial',
    blurb: 'Permissioned screenshots of real trials land here as sales ships them.',
    placeholder: true,
  },
  {
    id: 'live-slot',
    title: 'Live school builds',
    kind: 'live',
    blurb: 'Paid schools with approval appear in this gallery after go-live.',
    placeholder: true,
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
    title: 'Commons in five minutes',
    blurb: 'Public site, family portal, staff portal. What parents see vs what the board runs.',
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
    blurb: 'HSKRG Stripe checkout, invoices, and add-ons without mixing school Square.',
    duration: 'Coming soon',
    placeholder: true,
  },
]
