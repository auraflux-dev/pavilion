import { CalendarDays, CreditCard, UserCircle, Users } from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

type JumpItem = {
  href: string
  label: string
  hint: string
  icon: typeof Users
}

/** Jump links for core quadrants. Payment / Help / Business / Surveys live in shell or page anchors. */
export function PortalSectionNav(props?: { setupIncomplete?: boolean }) {
  const items: JumpItem[] = []
  if (props?.setupIncomplete) {
    items.push({
      href: '#portal-onboarding',
      label: 'Family setup',
      hint: 'Students & safety',
      icon: Users,
    })
  }
  items.push(
    {
      href: '#calendar',
      label: 'Calendar',
      hint: 'Messages too',
      icon: CalendarDays,
    },
    {
      href: '#account',
      label: 'Account',
      hint: 'Membership',
      icon: UserCircle,
    },
    {
      href: '#portal-students',
      label: 'Students',
      hint: 'Programs & board',
      icon: Users,
    },
    {
      href: '#store',
      label: vanillaizeIfDemo('Store & Cove'),
      hint: 'Balance & load',
      icon: CreditCard,
    },
  )

  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Member portal sections"
      items={items}
      variant="card"
    />
  )
}
