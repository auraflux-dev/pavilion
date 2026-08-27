/** Client-safe staff portal string helpers (no CMS/db imports). */

import { pickString } from '@/lib/api/page-strings-shared'
import {
  defaultStaffWorkspaceLabel,
  STAFF_PORTAL_DEFAULTS,
} from '@/lib/defaults/staff-portal-defaults'
import type { StaffWorkspace } from '@/lib/audience'
import type { StaffWorkspaceGroup } from '@/lib/staff/workspace-groups'
import { STAFF_WORKSPACE_GROUPS } from '@/lib/staff/workspace-groups'

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
  items: { id: StaffWorkspace; label: string }[],
  groups: StaffWorkspaceGroup[],
  copy: Record<string, string>,
): { group: StaffWorkspaceGroup; items: { id: StaffWorkspace; label: string }[] }[] {
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
