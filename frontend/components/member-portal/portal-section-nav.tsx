import { Briefcase, CalendarDays, CreditCard, ClipboardList, HelpCircle, Users } from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

const SECTIONS = [
  {
    href: '#portal-onboarding',
    label: 'Family setup',
    hint: 'Students & safety',
    icon: Users,
  },
  {
    href: '#calendar',
    label: 'Calendar & Messages',
    hint: 'Programs & inbox',
    icon: CalendarDays,
  },
  {
    href: '#store',
    label: vanillaizeIfDemo('Store & Cove Digital Card'),
    hint: 'Balance & purchases',
    icon: CreditCard,
  },
  {
    href: '#business',
    label: 'Business owners',
    hint: 'Tell us about your business',
    icon: Briefcase,
  },
  {
    href: '#surveys',
    label: 'Surveys',
    hint: 'Share feedback',
    icon: ClipboardList,
  },
  {
    href: '/member-portal/help',
    label: 'Help',
    hint: 'Knowledge base',
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
