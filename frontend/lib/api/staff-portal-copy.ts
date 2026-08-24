import { getPageStrings, pickString } from '@/lib/api/page-strings'
import {
  defaultStaffWorkspaceLabel,
  STAFF_PORTAL_DEFAULTS,
} from '@/lib/defaults/staff-portal-defaults'
import type { StaffWorkspace } from '@/lib/audience'
import { interpolateCopy } from '@/lib/api/portal-form-copy'

export async function getStaffPortalCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('staff-portal')
  return { ...STAFF_PORTAL_DEFAULTS, ...cms }
}

export function staffCopy(
  copy: Record<string, string>,
  key: string,
  fallback?: string,
): string {
  return pickString(copy, key, fallback ?? STAFF_PORTAL_DEFAULTS[key] ?? '')
}

export function staffWorkspaceLabel(
  copy: Record<string, string>,
  id: StaffWorkspace,
): string {
  return pickString(copy, `workspace.${id}`, defaultStaffWorkspaceLabel(id))
}

import type { StaffWorkspaceGroup } from '@/lib/staff/workspace-groups'
import { STAFF_WORKSPACE_GROUPS } from '@/lib/staff/workspace-groups'

export function resolveStaffWorkspaceGroups(
  copy: Record<string, string>,
): StaffWorkspaceGroup[] {
  return STAFF_WORKSPACE_GROUPS.map((g) => ({
    ...g,
    label: staffCopy(copy, `group.${g.id}.label`, g.label),
    blurb: staffCopy(copy, `group.${g.id}.blurb`, g.blurb),
  }))
}

/** Map allowed nav items into focus groups (empty groups dropped). */
export function groupStaffNavItemsWithCopy(
  items: { id: import('@/lib/audience').StaffWorkspace; label: string }[],
  groups: StaffWorkspaceGroup[],
  copy: Record<string, string>,
): { group: StaffWorkspaceGroup; items: { id: import('@/lib/audience').StaffWorkspace; label: string }[] }[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const grouped: { group: StaffWorkspaceGroup; items: typeof items }[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    const inGroup: typeof items = []
    for (const id of group.workspaces) {
      const item = byId.get(id)
      if (!item || id === 'home') continue
      inGroup.push(item)
      seen.add(id)
    }
    if (inGroup.length) grouped.push({ group, items: inGroup })
  }

  const leftover = items.filter((i) => i.id !== 'home' && !seen.has(i.id))
  if (leftover.length) {
    grouped.push({
      group: {
        id: 'other',
        label: staffCopy(copy, 'group.other.label', 'Other'),
        blurb: staffCopy(copy, 'group.other.blurb', 'Additional workspaces.'),
        workspaces: leftover.map((i) => i.id),
      },
      items: leftover,
    })
  }

  return grouped
}

