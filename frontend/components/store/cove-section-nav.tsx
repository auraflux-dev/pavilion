import { CreditCard, Candy, Shirt } from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'

const SECTIONS = [
  {
    href: '#card',
    label: 'Family Cove card',
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
      ariaLabel="The Cove sections"
      items={SECTIONS}
      variant="band"
    />
  )
}
