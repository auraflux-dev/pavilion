/**
 * Audience shells. who you are determines which chrome you see.
 *
 * visitor. public site Navbar (CMS marketing links) + Log in
 * free member. MemberShell on /member-portal; public Navbar when browsing the site
 * paid member. same as free, portal CTA labeled Member Portal
 * staff. StaffShell on /staff (@shmspto.org + StaffRoles); separate from parent login
 */
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

export type Audience = 'visitor' | 'free' | 'paid' | 'staff'

export type StaffWorkspace =
 | 'home'
 | 'projects'
 | 'members'
 | 'access'
 | 'social'
 | 'surveys'
 | 'messages'
 | 'minutes'
 | 'programs'
 | 'payments'
 | 'budget'
 | 'events'
 | 'retail'
 | 'discounts'
 | 'membership'
 | 'inbox'
 | 'calendar'
 | 'docs'
 | 'content'
 | 'site'
 | 'board'
 | 'nav'
 | 'faq'
 | 'volunteers'
 | 'fundraising'
 | 'tiers'
 | 'wellness'
 | 'newsletter'
 | 'comms'
 | 'canva'
 | 'expenses'
 | 'timesheets'
 | 'reports'
 | 'help'
 | 'pagetheme'
 | 'signups'
 | 'pages'
 | 'brand'
 | 'activity'

export const STAFF_WORKSPACE_LABEL: Record<StaffWorkspace, string> = {
 home: 'Home',
 projects: 'Projects',
 members: 'Members',
 access: 'Staff access',
 social: 'Social',
 surveys: 'Surveys',
 messages: 'Messages',
 minutes: 'Minutes',
 programs: 'Programs',
 payments: 'Payments and Refunds',
 budget: 'Budget',
 events: 'Events',
 retail: isDemoInstance() ? DEMO_BRAND.store : 'The Cove',
 discounts: 'Discounts',
 membership: 'Memberships',
 inbox: 'Inbox',
 calendar: 'Calendar',
 docs: 'Docs',
 content: 'Page copy',
 site: 'Site settings',
 board: 'Board roster',
 nav: 'Nav & footer',
 faq: 'FAQs',
 volunteers: 'Volunteer ops',
 fundraising: 'Fundraising',
 tiers: 'Membership tiers',
 wellness: 'Wellness',
 newsletter: 'Newsletter',
 comms: 'Comms & content',
 canva: 'Canva',
 expenses: 'Expenses',
 timesheets: 'Timesheets',
 reports: 'Reports',
 help: 'Help',
 pagetheme: 'Page CSS & strings',
 signups: 'Sign-up sheets',
 pages: 'Pages',
 brand: 'Brand',
 activity: 'Activity',
}
