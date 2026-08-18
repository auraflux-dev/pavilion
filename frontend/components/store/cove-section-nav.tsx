import { CreditCard, Candy, Shirt } from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'

import { DEMO_BRAND } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'

const SECTIONS = [
  {
    href: '#card',
    label: isPublicDemoInstance() ? DEMO_BRAND.card : 'Family Cove Digital Card',
    hint: 'Load & reload',
    icon: CreditCard,
  },
  {
    href: '#menu',
    label: 'Snack menu',
    hint: 'In-person window',
    icon: Candy,
  },
  {
    href: '#shop',
    label: 'Spirit wear',
    hint: 'Shop merch',
    icon: Shirt,
  },
] as const

/** Jump links so visitors see card / snacks / spirit wear before scrolling. */
export function CoveSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel={isPublicDemoInstance() ? `${DEMO_BRAND.store} sections` : 'The Cove sections'}
      items={SECTIONS}
      variant="band"
    />
  )
}
