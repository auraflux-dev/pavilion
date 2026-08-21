/**
 * Upsert Google Workspace users into StaffRoles so Access shows them
 * before first login (roles stay empty until an admin assigns).
 */
import { getWixClient } from '@/lib/wix-client'
import { listWorkspaceDirectoryUsers } from '@/lib/google/directory'
import { isStaffEmail } from '@/lib/staff/roles'

export type GoogleStaffSyncResult = {
  scanned: number
  created: number
  updatedNames: number
  skippedSuspended: number
  alreadyPresent: number
  emailsCreated: string[]
}

type StaffRoleRow = {
  _id?: string
  email?: string
  name?: string
  boardTitle?: string
  roles?: string
  active?: boolean
}

export async function syncStaffRolesFromGoogleDirectory(
  adminEmail: string,
): Promise<GoogleStaffSyncResult> {
  const users = await listWorkspaceDirectoryUsers(adminEmail)
  const client = getWixClient()

  const existing = await client.items.query('StaffRoles').limit(200).find()
  const byEmail = new Map<string, StaffRoleRow>()
  for (const row of (existing.items ?? []) as StaffRoleRow[]) {
    const email = String(row.email ?? '')
      .trim()
      .toLowerCase()
    if (email) byEmail.set(email, row)
  }

  const result: GoogleStaffSyncResult = {
    scanned: users.length,
    created: 0,
    updatedNames: 0,
    skippedSuspended: 0,
    alreadyPresent: 0,
    emailsCreated: [],
  }

  for (const user of users) {
    if (!isStaffEmail(user.email)) continue
    if (user.suspended) {
      result.skippedSuspended += 1
      continue
    }

    const row = byEmail.get(user.email)
    if (!row) {
      await client.items.insert('StaffRoles', {
        email: user.email,
        name: user.name,
        boardTitle: '',
        roles: '',
        active: true,
      })
      result.created += 1
      result.emailsCreated.push(user.email)
      continue
    }

    result.alreadyPresent += 1
    const currentName = String(row.name ?? '').trim()
    if (!currentName && user.name && row._id) {
      await client.items.update('StaffRoles', {
        ...row,
        _id: row._id,
        name: user.name,
      })
      result.updatedNames += 1
    }
  }

  return result
}
