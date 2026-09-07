'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, CalendarDays, CreditCard, ClipboardList, HelpCircle, Users } from 'lucide-react'
import { SectionJumpNav, type SectionJumpItem } from '@/components/section-jump-nav'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

const BASE_SECTIONS: SectionJumpItem[] = [
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
    href: '/member-portal/payment-methods',
    label: 'Payment methods',
    hint: 'Card on file',
    icon: CreditCard,
  },
  {
    href: '#business',
    label: 'Business owners',
    hint: 'Tell us about your business',
    icon: Briefcase,
  },
  {
    href: '#help',
    label: 'Help',
    hint: 'Ask a question',
    icon: HelpCircle,
  },
]

/** Jump links so parents see sections below Account / Students without scrolling past them. */
export function PortalSectionNav() {
  const [hasSurveys, setHasSurveys] = useState(false)

  useEffect(() => {
    fetch('/api/surveys')
      .then((r) => r.json())
      .then((d) => setHasSurveys(Array.isArray(d.surveys) && d.surveys.length > 0))
      .catch(() => setHasSurveys(false))
  }, [])

  const items = useMemo(() => {
    const list = [...BASE_SECTIONS]
    if (hasSurveys) {
      list.splice(list.length - 1, 0, {
        href: '#surveys',
        label: 'Surveys',
        hint: 'Share feedback',
        icon: ClipboardList,
      })
    }
    return list
  }, [hasSurveys])

  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Member portal sections"
      items={items}
      variant="card"
    />
  )
}
