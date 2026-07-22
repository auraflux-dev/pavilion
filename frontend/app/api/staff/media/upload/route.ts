/**
 * POST /api/staff/media/upload
 * multipart: file (image/*) → Wix Media Manager → { url }
 * Shared flyer/photo upload for programs, events, page heroes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaBuffer } from '@/lib/social/wix-media'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const mimeType = file.type || 'image/jpeg'
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, or GIF uploads are allowed' },
        { status: 400 },
      )
    }
    if (file.size > 8 * 1024 * 1024) {
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
