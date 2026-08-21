/**
 * Google Admin Directory (read-only): list @shmspto.org users.
 * Caller must be a Workspace admin and have Connect Google with directory scope.
 */
import { GOOGLE_SCOPES, getStaffGoogleAccess } from '@/lib/google/workspace-auth'
import { STAFF_EMAIL_DOMAIN } from '@/lib/staff/roles'

export type WorkspaceDirectoryUser = {
  email: string
  name: string
  suspended: boolean
}

type DirectoryUserRow = {
  primaryEmail?: string
  name?: { fullName?: string; givenName?: string; familyName?: string }
  suspended?: boolean
}

function displayName(row: DirectoryUserRow, email: string): string {
  const full = String(row.name?.fullName ?? '').trim()
  if (full) return full
  const parts = [row.name?.givenName, row.name?.familyName]
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
  if (parts.length) return parts.join(' ')
  return email.split('@')[0] || email
}

/**
 * All active (non-suspended) users on the staff domain.
 * Requires admin.directory.user.readonly on the connected admin account.
 */
export async function listWorkspaceDirectoryUsers(
  staffEmail: string,
): Promise<WorkspaceDirectoryUser[]> {
  const access = await getStaffGoogleAccess(staffEmail, GOOGLE_SCOPES.directory)
  if (!access) {
    throw new Error(
      'Connect Google in Staff → Inbox first (as a Google Workspace admin), then Sync again.',
    )
  }

  const out: WorkspaceDirectoryUser[] = []
  let pageToken = ''
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      domain: STAFF_EMAIL_DOMAIN,
      maxResults: '200',
      orderBy: 'email',
      projection: 'basic',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users?${params}`,
      { headers: { Authorization: `Bearer ${access.accessToken}` } },
    )
    const data = (await res.json().catch(() => ({}))) as {
      users?: DirectoryUserRow[]
      nextPageToken?: string
      error?: { message?: string; code?: number }
    }
    if (!res.ok) {
      const msg = data.error?.message || `Directory API ${res.status}`
      if (/Not Authorized|insufficient|accessNotConfigured|403/i.test(msg) || res.status === 403) {
        throw new Error(
          'Google Directory access denied. Your Connect Google account must be a Workspace admin, and you may need to Connect Google again to grant directory permission.',
        )
      }
      throw new Error(msg)
    }

    for (const row of data.users ?? []) {
      const email = String(row.primaryEmail ?? '')
        .trim()
        .toLowerCase()
      if (!email.endsWith(`@${STAFF_EMAIL_DOMAIN}`)) continue
      out.push({
        email,
        name: displayName(row, email),
        suspended: row.suspended === true,
      })
    }

    pageToken = String(data.nextPageToken ?? '').trim()
    if (!pageToken) break
  }

  return out
}
