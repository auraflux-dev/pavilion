import { STAFF_WORKSPACE_LABEL, type StaffWorkspace } from '@/lib/audience'
import { STAFF_WORKSPACE_BLURB, STAFF_WORKSPACE_GROUPS } from '@/lib/staff/workspace-groups'

/** Staff portal UI copy (PageContent page: staff-portal). */

function workspaceDefaults(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, label] of Object.entries(STAFF_WORKSPACE_LABEL)) {
    out[`workspace.${id}`] = label
  }
  for (const [id, blurb] of Object.entries(STAFF_WORKSPACE_BLURB)) {
    out[`blurb.${id}`] = blurb
  }
  for (const g of STAFF_WORKSPACE_GROUPS) {
    out[`group.${g.id}.label`] = g.label
    out[`group.${g.id}.blurb`] = g.blurb
  }
  return out
}

export const STAFF_PORTAL_DEFAULTS: Record<string, string> = {
  ...workspaceDefaults(),
  'shell.staff': 'Staff',
  'shell.boardMember': 'Board member',
  'shell.more': 'More',
  'shell.member': 'Member',
  'shell.viewSite': 'View site',
  'shell.signOut': 'Sign out',
  'shell.closeMenu': 'Close menu',
  'shell.openMenu': 'Open menu',
  'shell.editing': 'Editing · {workspace}',
  'shell.workspace': 'Staff workspace · {workspace}',
  'shell.home': 'Home',
  'dashboard.accessRequired': 'Staff access required',
  'dashboard.backToPortal': 'Back to member portal',
  'dashboard.loading': 'Loading staff workspace…',
  'dashboard.homeTitle': 'Home',
  'dashboard.needsAttention': 'Needs your attention',
  'dashboard.thisWeek': 'This week',
  'dashboard.membersTitle': 'Members',
  'dashboard.searchPlaceholder': 'Account #, email, or student name',
  'dashboard.search': 'Search',
  'dashboard.clear': 'Clear',
  'dashboard.filterAll': 'All accounts',
  'dashboard.filterPaid': 'Paid only',
  'dashboard.filterFree': 'Free only',
  'dashboard.filterByEmail': 'By email',
  'dashboard.filterByName': 'By name',
  'dashboard.archiveConfirm':
    'Archive this student? They will be hidden from the roster but records stay in Wix.',
}

export function defaultStaffWorkspaceLabel(id: StaffWorkspace): string {
  return STAFF_WORKSPACE_LABEL[id]
}
