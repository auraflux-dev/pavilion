import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { importMediaFromUrl, uploadMediaBuffer } from '@/lib/social/wix-media'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 })
      }
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'File must be 25MB or smaller' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadMediaBuffer(buffer, {
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name || 'upload.bin',
      })
      return NextResponse.json({
        ok: true,
        file: {
          id: uploaded.id,
          url: uploaded.url,
          displayName: uploaded.displayName,
          mediaType: uploaded.mediaType,
          thumbnailUrl: uploaded.thumbnailUrl,
        },
      })
    }

    const body = await req.json()
    const url = String(body.url ?? '').trim()
    if (!url) {
      return NextResponse.json({ error: 'url or multipart file is required' }, { status: 400 })
    }
    const imported = await importMediaFromUrl(url, {
      mimeType: body.mimeType ? String(body.mimeType) : undefined,
      displayName: body.displayName ? String(body.displayName) : undefined,
    })
    return NextResponse.json({
      ok: true,
      file: {
        id: imported.id,
        url: imported.url,
        displayName: imported.displayName,
        mediaType: imported.mediaType,
        thumbnailUrl: imported.thumbnailUrl,
      },
    })
  } catch (err) {
    console.error('/api/staff/social/media POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Media upload failed' },
      { status: 500 }
    )
  }
}
