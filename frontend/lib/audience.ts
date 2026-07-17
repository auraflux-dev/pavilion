/**
 * Audience shells — who you are determines which chrome you see.
 *
 * visitor     — public site Navbar (CMS marketing links) + Log in
 * free member — MemberShell on /member-portal; public Navbar when browsing the site
 * paid member — same as free, portal CTA labeled Member Portal
 * staff       — StaffShell on /staff (@shmspto.org + StaffRoles); separate from parent login
 *
 * Do not reuse the public marketing nav inside /staff or /member-portal —
 * those surfaces get their own top nav so parents/board are not confused.
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
  | 'help'

export const STAFF_WORKSPACE_LABEL: Record<StaffWorkspace, string> = {
  home: 'Home',
  projects: 'Projects',
  members: 'Members',
  access: 'Staff access',
  social: 'Social',
  surveys: 'Surveys',
  messages: 'Messages',
  help: 'Help',
}
