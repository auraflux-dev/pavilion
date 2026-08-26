/**
 * POST /api/staff/roles/ensure-membership
 * President/admin: stamp `membership` on every active board StaffRoles row
 * so Access shows it and fulfillments work at in-person events.
 * Instructor-only rows are left alone.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { parseExtraWorkspaces, WORKSPACE_ROLES } from '@/lib/staff/permissions'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  isInstructorStaffOnly,
  parseRoles,
  type StaffRole,
} from '@/lib/staff/roles'

export const dynamic = 'force-dynamic'

const BOARD_MEMBERSHIP_ROLES = new Set(WORKSPACE_ROLES.membership)

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const client = getWixClient()
    const listed = await client.items.query('StaffRoles').limit(200).find()
    const rows = (listed.items ?? []) as Array<{
      _id?: string
      email?: string
      roles?: string
      extraWorkspaces?: string
      active?: boolean
    }>

    let scanned = 0
    let updated = 0
    let already = 0
    let skipped = 0
    const updatedEmails: string[] = []

    for (const row of rows) {
      if (!row._id || row.active === false) {
        skipped += 1
        continue
      }
      scanned += 1
      const roles = parseRoles(row.roles)
      if (!roles.length || isInstructorStaffOnly(roles)) {
        skipped += 1
        continue
      }
      if (!roles.some((r: StaffRole) => BOARD_MEMBERSHIP_ROLES.has(r))) {
        skipped += 1
        continue
      }

      const extras = parseExtraWorkspaces(row.extraWorkspaces)
      if (extras.includes('membership')) {
        already += 1
        continue
      }

      const nextExtras = [...extras, 'membership']
      await client.items.update('StaffRoles', {
        ...row,
        _id: row._id,
        extraWorkspaces: nextExtras.join(','),
      })
      updated += 1
      const email = String(row.email ?? '').trim().toLowerCase()
      if (email) updatedEmails.push(email)
    }

    return NextResponse.json({
      ok: true,
      scanned,
      updated,
      already,
      skipped,
      updatedEmails,
    })
  } catch (err) {
    console.error('ensure-membership', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update staff roles' },
      { status: 500 },
    )
  }
}
