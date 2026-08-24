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
  'dashboard.introCommons':
    'Open a workspace from the top nav.\nStart with Membership, Events, or Site.',
  'dashboard.introShms':
    'Your role cards below show what needs attention this week.',
  'dashboard.statusArchived': 'Student archived.',
  'dashboard.statusRestored': 'Student restored.',
  'members.title': 'Members',
  'members.body':
    'Account number is the top line for each family.\nSearch by account #, email, or student name.\nFilter paid vs free, act-as, or archive / restore a student.',
  'members.searchTitle': 'Search',
  'members.lookupLabel': 'Lookup',
  'members.actAsTitle': 'Act as parent',
  'members.actAsBody':
    'Open the member portal as a parent for support.\nUse only for legitimate board support.',
  'members.actAsEmail': 'Parent email',
  'members.actAsButton': 'Act as parent',
  'messages.title': 'Messages',
  'messages.body':
    'Send a note to one parent or a grade/program cohort.\nMessages land in the parent inbox.',
  'messages.subject': 'Subject',
  'messages.bodyLabel': 'Message',
  'messages.recipientEmail': 'Parent email (one family)',
  'messages.gradeFilter': 'Grade filter (optional)',
  'messages.programFilter': 'Program filter (optional)',
  'messages.send': 'Send message',
  'messages.sent': 'Message sent to parent inbox.',
  'messages.sending': 'Sending…',
  'messages.sendInbox': 'Send to inbox',
  'messages.subjectPlaceholder': 'Subject',
  'messages.bodyPlaceholder': 'Message body',
  'messages.emailPlaceholder': 'Parent email (optional)',
  'messages.gradePlaceholder': 'Grade e.g. 6',
  'messages.programPlaceholder': 'Program name',
  'members.filterLabel': 'Filter',
  'members.sortLabel': 'Sort',
  'shell.siteHome': 'Site home',
  'shell.privacy': 'Privacy',
  'shell.terms': 'Terms',
  'shell.dataSecurity': 'Data security',
  'shell.docsHint': 'Drive docs 26 to 40 for how-tos',
}

export function defaultStaffWorkspaceLabel(id: StaffWorkspace): string {
  return STAFF_WORKSPACE_LABEL[id]
}
