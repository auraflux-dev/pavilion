import { GOOGLE_SCOPES, getStaffGoogleAccess } from '@/lib/google/workspace-auth'

export type DriveFileItem = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string
  iconLink: string
  shared: boolean
}

export async function listDocs(staffEmail: string, pageSize = 40): Promise<DriveFileItem[]> {
  const access = await getStaffGoogleAccess(staffEmail, GOOGLE_SCOPES.drive)
  if (!access) throw new Error('Google Drive is not connected for this staff account')

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  const q = folderId
    ? `'${folderId}' in parents and trashed = false`
    : `(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/pdf') and trashed = false`

  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    orderBy: 'modifiedTime desc',
    fields:
      'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,shared),nextPageToken',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${access.accessToken}` },
  })
  const data = (await res.json()) as {
    files?: {
      id?: string
      name?: string
      mimeType?: string
      modifiedTime?: string
      webViewLink?: string
      iconLink?: string
      shared?: boolean
    }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data.error?.message || 'Could not load Drive files')

  return (data.files ?? [])
    .filter((f) => f.id && f.webViewLink)
    .map((f) => ({
      id: f.id!,
      name: f.name || 'Untitled',
      mimeType: f.mimeType || '',
      modifiedTime: f.modifiedTime || '',
      webViewLink: f.webViewLink!,
      iconLink: f.iconLink || '',
      shared: Boolean(f.shared),
    }))
}
