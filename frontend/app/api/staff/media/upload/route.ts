/**
 * POST /api/staff/media/upload
 * multipart: file → Wix Media Manager → { url }
 * Images for flyers/photos; MP4/WebM/MOV for program landing videos (kind=video).
 */
import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaBuffer } from '@/lib/social/wix-media'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const IMAGE_MAX = 8 * 1024 * 1024
const VIDEO_MAX = 50 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'programs',
      'instructor',
      'coordinator',
      'events',
      'marketing',
      'secretary',
      'admin',
      'retail',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    const kind = String(form.get('kind') ?? 'image')
    const mimeType = file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg')

    if (kind === 'video' || VIDEO_MIMES.has(mimeType)) {
      if (!VIDEO_MIMES.has(mimeType)) {
        return NextResponse.json(
          { error: 'Only MP4, WebM, or MOV video uploads are allowed' },
          { status: 400 },
        )
      }
      if (file.size > VIDEO_MAX) {
        return NextResponse.json({ error: 'Video must be under 50MB' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadMediaBuffer(buffer, {
        mimeType,
        fileName: file.name || `program-video-${Date.now()}.mp4`,
      })
      return NextResponse.json({
        ok: true,
        url: uploaded.url,
        name: uploaded.displayName,
        id: uploaded.id,
      })
    }

    if (!IMAGE_MIMES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, or GIF uploads are allowed' },
        { status: 400 },
      )
    }
    if (file.size > IMAGE_MAX) {
      return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadMediaBuffer(buffer, {
      mimeType,
      fileName: file.name || `flyer-${Date.now()}.jpg`,
    })
    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      name: uploaded.displayName,
      id: uploaded.id,
    })
  } catch (err) {
    console.error('staff media upload', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
