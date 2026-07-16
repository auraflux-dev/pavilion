/**
 * Wix Media Manager helpers for Social Publisher (requires static.wixstatic.com / video.wixstatic.com URLs).
 */

function wixHeaders() {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) throw new Error('WIX_API_KEY / WIX_SITE_ID not configured')
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

export interface UploadedMediaFile {
  id: string
  url: string
  displayName: string
  mediaType: 'IMAGE' | 'VIDEO' | string
  thumbnailUrl?: string
}

export async function importMediaFromUrl(
  url: string,
  options?: { mimeType?: string; displayName?: string }
): Promise<UploadedMediaFile> {
  const res = await fetch('https://www.wixapis.com/site-media/v1/files/import', {
    method: 'POST',
    headers: wixHeaders(),
    body: JSON.stringify({
      url,
      mimeType: options?.mimeType,
      displayName: options?.displayName,
      parentFolderId: 'media-root',
    }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    file?: UploadedMediaFile
    message?: string
  }
  if (!res.ok || !body.file?.url) {
    throw new Error(body.message || `Media import failed (${res.status})`)
  }
  return body.file
}

export async function uploadMediaBuffer(
  buffer: Buffer,
  options: { mimeType: string; fileName: string }
): Promise<UploadedMediaFile> {
  const genRes = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
    method: 'POST',
    headers: wixHeaders(),
    body: JSON.stringify({
      mimeType: options.mimeType,
      fileName: options.fileName,
      sizeInBytes: String(buffer.length),
      parentFolderId: 'media-root',
      private: false,
    }),
  })
  const genBody = (await genRes.json().catch(() => ({}))) as {
    uploadUrl?: string
    message?: string
  }
  if (!genRes.ok || !genBody.uploadUrl) {
    throw new Error(genBody.message || `Could not generate upload URL (${genRes.status})`)
  }

  const putRes = await fetch(genBody.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': options.mimeType },
    body: new Uint8Array(buffer),
  })
  const putBody = (await putRes.json().catch(() => ({}))) as {
    file?: UploadedMediaFile
    message?: string
  }
  if (!putRes.ok || !putBody.file?.url) {
    throw new Error(putBody.message || `Media upload failed (${putRes.status})`)
  }
  return putBody.file
}

export function isWixMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host.includes('wixstatic.com') || host.includes('wixmp.com')
  } catch {
    return false
  }
}

/** Ensure Social Publisher gets a Media Manager URL; import external URLs when needed. */
export async function ensureWixMediaUrl(url: string, mimeHint?: string): Promise<string> {
  if (!url) return url
  if (isWixMediaUrl(url)) return url
  const imported = await importMediaFromUrl(url, { mimeType: mimeHint })
  return imported.url
}
