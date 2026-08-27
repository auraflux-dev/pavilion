import 'server-only'

import { getPageStrings } from '@/lib/api/page-strings'
import { STAFF_PORTAL_DEFAULTS } from '@/lib/defaults/staff-portal-defaults'

export {
  staffCopy,
  staffWorkspaceLabel,
  resolveStaffWorkspaceGroups,
  groupStaffNavItemsWithCopy,
} from '@/lib/api/staff-portal-copy-shared'

export async function getStaffPortalCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('staff-portal')
  return { ...STAFF_PORTAL_DEFAULTS, ...cms }
}
