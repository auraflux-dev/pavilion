import {
  CalendarDays,
  ClipboardList,
  Gift,
  Handshake,
  Heart,
  HelpCircle,
  LayoutList,
  Mail,
  Megaphone,
  PieChart,
  Sparkles,
  Star,
  Users,
  UserPlus,
} from 'lucide-react'
import { SectionJumpNav, type SectionJumpItem } from '@/components/section-jump-nav'
import { isPublicDemoInstance } from '@/lib/demo/instance'

function BandNav({
  ariaLabel,
  items,
}: {
  ariaLabel: string
  items: readonly SectionJumpItem[]
}) {
  if (!items.length) return null
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel={ariaLabel}
      items={items}
      variant="band"
    />
  )
}

function stillShowingRunForCharity(now = new Date()): boolean {
  try {
    const todayEt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    return todayEt <= '2026-09-13'
  } catch {
    return now.toISOString().slice(0, 10) <= '2026-09-13'
  }
}

export function HomeSectionNav({
  showPrograms,
  showEvents,
}: {
  showPrograms: boolean
  showEvents: boolean
}) {
  const items: SectionJumpItem[] = [
    ...(stillShowingRunForCharity()
      ? [
          {
            href: '#run-for-charity',
            label: 'Run for Charity',
            hint: 'Sun 9/13',
            icon: Megaphone,
          } satisfies SectionJumpItem,
        ]
      : []),
    ...(showPrograms
      ? [
          {
            href: '#programs',
            label: 'Programs',
            hint: 'Enrichment',
            icon: Sparkles,
          } satisfies SectionJumpItem,
        ]
      : []),
    {
      href: '#volunteer',
      label: 'Volunteer',
      hint: 'Give an hour',
      icon: Users,
    },
    ...(showEvents
      ? [
          {
            href: '#events',
            label: 'Events',
            hint: 'This season',
            icon: CalendarDays,
          } satisfies SectionJumpItem,
        ]
      : []),
    {
      href: '#donate',
      label: 'Donate',
      hint: 'Any amount',
      icon: Heart,
    },
  ]
  return <BandNav ariaLabel="Home page sections" items={items} />
}

export function FundraisingSectionNav() {
  return (
    <BandNav
      ariaLabel="Fundraising page sections"
      items={[
        { href: '#donate', label: 'Donate', hint: 'Make a gift', icon: Heart },
        { href: '#initiatives', label: 'Initiatives', hint: 'Ways to help', icon: Megaphone },
        { href: '#membership', label: 'Memberships', hint: 'Reef · Lagoon · Tide', icon: Star },
        { href: '#allocations', label: 'Where funds go', hint: 'Budget', icon: PieChart },
        { href: '#sponsorship', label: 'Sponsorships', hint: 'Partners', icon: Handshake },
        { href: '#contribute', label: 'Contribute', hint: 'Pick an action', icon: Gift },
      ]}
    />
  )
}

export function MembershipSectionNav() {
  const commons =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'
  const tierHint = isPublicDemoInstance()
    ? 'Member · Family · Patron'
    : commons
      ? 'Family · $25'
      : 'Reef · Lagoon · Tide'
  return (
    <BandNav
      ariaLabel="Membership page sections"
      items={[
        {
          href: '#tiers',
          label: commons ? 'Join' : 'Tiers',
          hint: tierHint,
          icon: Gift,
        },
        { href: '#portal', label: 'Portal', hint: 'What you get', icon: LayoutList },
        ...(commons
          ? []
          : [{ href: '#faculty', label: 'Faculty', hint: 'Staff membership', icon: Users }]),
        { href: '#donate', label: 'Donate', hint: commons ? 'Give directly' : 'Skip paid tier', icon: Heart },
        { href: '#faq', label: 'FAQ', hint: 'Common questions', icon: HelpCircle },
      ]}
    />
  )
}

export function VolunteerSectionNav() {
  return (
    <BandNav
      ariaLabel="Volunteer page sections"
      items={[
        { href: '#why', label: 'Why it matters', hint: 'Impact', icon: Heart },
        { href: '#opportunities', label: 'Opportunities', hint: 'Ways to help', icon: ClipboardList },
        { href: '#signup', label: 'Sign up', hint: 'Volunteer form', icon: UserPlus },
      ]}
    />
  )
}

export function BoardSectionNav() {
  return (
    <BandNav
      ariaLabel="Board page sections"
      items={[
        { href: '#leadership', label: 'Leadership', hint: 'Executive officers', icon: Users },
        { href: '#committees', label: 'Committees', hint: 'Program leads', icon: ClipboardList },
        { href: '#join', label: 'Join the board', hint: 'Get involved', icon: UserPlus },
      ]}
    />
  )
}

export function MeetingsSectionNav() {
  return (
    <BandNav
      ariaLabel="Meetings page sections"
      items={[
        { href: '#pto', label: 'PTO meetings', hint: 'Minutes & join', icon: Users },
        { href: '#committees', label: 'Committees', hint: 'SEAC · MSAAC · LEAF', icon: ClipboardList },
        { href: '#join', label: 'Get notified', hint: 'Member email', icon: Mail },
      ]}
    />
  )
}

export function EventsSectionNav() {
  return (
    <BandNav
      ariaLabel="Events page sections"
      items={[
        { href: '#events-list', label: 'All events', hint: 'Upcoming', icon: CalendarDays },
        { href: '#event-ideas', label: 'Suggest an idea', hint: 'Tell VP Events', icon: Megaphone },
        { href: '#newsletter', label: 'Newsletter', hint: 'Never miss one', icon: Mail },
      ]}
    />
  )
}

export function ProgramsSectionNav() {
  return (
    <BandNav
      ariaLabel="Programs page sections"
      items={[
        { href: '#programs-list', label: 'All programs', hint: 'Browse & filter', icon: Sparkles },
        { href: '/programs/fall-2026', label: 'Fall 2026 schedule', hint: 'Times and dates', icon: CalendarDays },
        { href: '#programs-contact', label: 'Ask a question', hint: 'VP of Programs', icon: HelpCircle },
      ]}
    />
  )
}
