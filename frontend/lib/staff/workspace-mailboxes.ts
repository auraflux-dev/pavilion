/**
 * Google Workspace directory as of 19 Aug 2026 (all mailboxes Rob pasted).
 * Use this list when assigning Staff access. do not invent new EP aliases.
 */
export type WorkspaceMailboxGroup = 'ep' | 'board' | 'cove' | 'person' | 'liaison'

export type WorkspaceMailbox = {
  email: string
  displayName: string
  group: WorkspaceMailboxGroup
  note?: string
}

export const WORKSPACE_MAILBOXES: WorkspaceMailbox[] = [
  { email: 'bayansouqi@shmspto.org', displayName: 'Bayan Souqi', group: 'person', note: 'Teacher & Staff Wellness' },
  { email: 'cove-staff@shmspto.org', displayName: 'Cove Staff', group: 'cove', note: 'Shared Cove volunteers' },
  { email: 'cove@shmspto.org', displayName: 'Cove Coordinator', group: 'cove' },
  { email: 'ep-health-ayurveda@shmspto.org', displayName: 'EP Health Ayurveda', group: 'ep' },
  { email: 'ep-music-tabla@shmspto.org', displayName: 'EP Music Tabla', group: 'ep' },
  { email: 'ep-businessplan@shmspto.org', displayName: 'EP Business Plan Instructor', group: 'ep', note: 'Fall 2026 YE suggestion' },
  { email: 'ep-finance@shmspto.org', displayName: 'EP Finance Instructor', group: 'ep' },
  { email: 'ep-math@shmspto.org', displayName: 'EP Math Instructor', group: 'ep', note: 'Fall 2026 MATHCOUNTS suggestion' },
  { email: 'ep-programming@shmspto.org', displayName: 'EP Programming Instructor', group: 'ep' },
  { email: 'ep-robotics@shmspto.org', displayName: 'EP Robotics Instructor', group: 'ep', note: 'Fall 2026 Robotics suggestion' },
  { email: 'gracehuang@shmspto.org', displayName: 'Grace Huang', group: 'person' },
  { email: 'kellyfarver@shmspto.org', displayName: 'Kelly Farver', group: 'person' },
  { email: 'nilakshideshpande@shmspto.org', displayName: 'Nilakshi Deshpande', group: 'person' },
  { email: 'robertgregory@shmspto.org', displayName: 'Robert Gregory', group: 'person' },
  { email: 'sarathkolla@shmspto.org', displayName: 'Sarath Kolla', group: 'person' },
  { email: 'seac@shmspto.org', displayName: 'SHMS SEAC Representative', group: 'liaison' },
  { email: 'leaf@shmspto.org', displayName: 'SHMS Leaf Representative', group: 'liaison' },
  { email: 'vp-events@shmspto.org', displayName: 'SHMS PTO VP Events', group: 'board' },
  { email: 'vp-clubs@shmspto.org', displayName: 'SHMS PTO VP Clubs', group: 'board' },
  { email: 'vp-fundraising@shmspto.org', displayName: 'SHMS PTO VP Fundraising', group: 'board' },
  { email: 'president@shmspto.org', displayName: 'SHMS PTO President', group: 'board' },
  { email: 'treasurer@shmspto.org', displayName: 'SHMS PTO Treasurer', group: 'board' },
  { email: 'vp-sponsorships@shmspto.org', displayName: 'SHMS PTO VP Sponsorships', group: 'board' },
  { email: 'secretary@shmspto.org', displayName: 'SHMS PTO Secretary', group: 'board' },
  { email: 'vp-membershipexperience@shmspto.org', displayName: 'SHMS PTO VP Membership Experience', group: 'board' },
  { email: 'vp-community-events@shmspto.org', displayName: 'SHMS PTO VP Community Events', group: 'board' },
  { email: 'initiatives-coordinator@shmspto.org', displayName: 'Initiatives Coordinator', group: 'board', note: 'Programs · board seat (Reef + 75% EP)' },
  { email: 'vp-initiatives@shmspto.org', displayName: 'SHMSPTO VP Initiatives', group: 'board', note: 'Programs / all instructors' },
  { email: 'spiritwear@shmspto.org', displayName: 'Spirit Wear', group: 'cove' },
  { email: 'vp-sales@shmspto.org', displayName: 'Vice President Sales', group: 'board' },
  { email: 'vp-marketing@shmspto.org', displayName: 'VP-Marketing SHMS PTO', group: 'board' },
]

export const EP_INSTRUCTOR_MAILBOXES = WORKSPACE_MAILBOXES.filter((row) => row.group === 'ep')

export function findWorkspaceMailbox(email: string): WorkspaceMailbox | undefined {
  const n = email.trim().toLowerCase()
  return WORKSPACE_MAILBOXES.find((row) => row.email === n)
}
