import {
  CalendarDays,
  ClipboardList,
  FileText,
  Goal,
  HandCoins,
  ListOrdered,
  Mail,
  MessageCircle,
  Newspaper,
  Package,
  Percent,
  Shirt,
  ShoppingCart,
  Store,
  Tag,
  Users,
  UserPlus,
} from 'lucide-react'
import { SectionJumpNav } from '@/components/section-jump-nav'

/** Jump links for Membership tab action sections. */
export function StaffMembershipSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Membership sections"
      items={[
        { href: '#membership-invite', label: 'Invite', hint: 'Free signup at table', icon: UserPlus },
        { href: '#membership-roster', label: 'Roster', hint: 'Parents & tiers', icon: Users },
        { href: '#membership-outreach', label: 'Outreach', hint: 'Email & WhatsApp', icon: Mail },
        {
          href: '#membership-fulfillment',
          label: 'Fulfillment',
          hint: 'Shirts & magnets',
          icon: Package,
        },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Cove / retail tab. */
export function StaffRetailSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Cove retail sections"
      items={[
        { href: '#cove-register', label: 'In-person', hint: 'Any table sale', icon: ShoppingCart },
        {
          href: '#cove-store-pickups',
          label: 'Store pickups',
          hint: 'Window · handed out',
          icon: Package,
        },
        {
          href: '#cove-membership-shirts',
          label: 'Shirt designs',
          hint: 'Membership perk',
          icon: Shirt,
        },
        {
          href: '#cove-demand',
          label: 'Size demand',
          hint: 'OOS shirts/hoodies',
          icon: ClipboardList,
        },
        {
          href: '#cove-fulfillment',
          label: 'Shirts/magnets',
          hint: 'Membership perks',
          icon: Package,
        },
        { href: '#cove-stock-admin', label: 'Stock setup', hint: 'Admin · not sales', icon: Store },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Events tab. */
export function StaffEventsSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Events sections"
      items={[
        { href: '#staff-events', label: 'Public events', hint: 'Site calendar', icon: CalendarDays },
        {
          href: '#portal-calendar-events',
          label: 'Portal calendar',
          hint: 'Member portal',
          icon: CalendarDays,
        },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Fundraising tab. */
export function StaffFundraisingSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Fundraising sections"
      items={[
        { href: '#fundraising-ctas', label: 'CTAs', hint: 'Campaign buttons', icon: HandCoins },
        { href: '#fundraising-sponsors', label: 'Sponsors', hint: 'Public list', icon: Users },
        { href: '#fundraising-goals', label: 'Goals', hint: 'Site settings', icon: Goal },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Newsletter tab. */
export function StaffNewsletterSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Newsletter sections"
      items={[
        {
          href: '#whatsapp-queue',
          label: 'WhatsApp queue',
          hint: 'Grade groups',
          icon: MessageCircle,
        },
        { href: '#member-newsletter', label: 'Newsletter', hint: 'Compose & send', icon: Newspaper },
        {
          href: '#newsletter-archive',
          label: 'Archive',
          hint: 'Portal messages',
          icon: FileText,
        },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Expenses tab. */
export function StaffExpensesSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Expenses sections"
      items={[
        {
          href: '#expense-submit',
          label: 'Submit',
          hint: 'New reimbursement',
          icon: HandCoins,
        },
        {
          href: '#expense-requests',
          label: 'Requests',
          hint: 'Status & approve',
          icon: ListOrdered,
        },
      ]}
      variant="card"
    />
  )
}

/** Jump links for Discount codes tab. */
export function StaffDiscountsSectionNav() {
  return (
    <SectionJumpNav
      eyebrow="Jump to"
      ariaLabel="Discount code sections"
      items={[
        { href: '#discount-create', label: 'Create code', hint: 'Named percent-off', icon: Percent },
        { href: '#discount-issue', label: 'Issue to member', hint: 'Personal code', icon: Tag },
        { href: '#discount-active', label: 'Active codes', hint: 'List & deactivate', icon: ListOrdered },
      ]}
      variant="card"
    />
  )
}
