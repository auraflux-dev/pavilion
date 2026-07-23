/**
 * Audience shells — who you are determines which chrome you see.
 *
 * visitor     — public site Navbar (CMS marketing links) + Log in
 * free member — MemberShell on /member-portal; public Navbar when browsing the site
 * paid member — same as free, portal CTA labeled Member Portal
 * staff       — StaffShell on /staff (@shmspto.org + StaffRoles); separate from parent login
 */

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
  | 'expenses'
  | 'timesheets'
  | 'reports'
  | 'help'

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
  payments: 'Payments',
  events: 'Events',
  retail: 'The Cove',
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
  expenses: 'Expenses',
  timesheets: 'Timesheets',
  reports: 'Reports',
  help: 'Help',
}
