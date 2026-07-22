import { CalendarDays, CreditCard, ClipboardList, HelpCircle } from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'

const SECTIONS = [
  {
    href: '#calendar',
    label: 'Calendar & Messages',
    hint: 'Programs & inbox',
    icon: CalendarDays,
  },
  {
    href: '#store',
    label: 'Store & Cove card',
    hint: 'Balance & purchases',
    icon: CreditCard,
  },
  {
    href: '#surveys',
    label: 'Surveys',
    hint: 'Share feedback',
    icon: ClipboardList,
  },
  {
    href: '#help',
    label: 'Help',
    hint: 'Guides & FAQs',
    icon: HelpCircle,
  },
] as const

/** Jump links so parents see sections below Account / Students without scrolling past them. */
export function PortalSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Member portal sections"
      items={SECTIONS}
      variant="card"
    />
  )
}
