import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'
import { cmsMediaConfigured, putCmsMedia } from '@/lib/cms/cms-media'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const IMAGE_MAX = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!cmsPageBuilderEnabled()) {
    return NextResponse.json({ error: 'Unavailable' }, { status: 404 })
  }
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    const mimeType = file.type || 'image/jpeg'
    if (!IMAGE_MIMES.has(mimeType)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 })
    }
    if (file.size > IMAGE_MAX) {
      return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (cmsMediaConfigured()) {
      const uploaded = await putCmsMedia(buffer, {
        filename: file.name || 'image.jpg',
        mimeType,
      })
      return NextResponse.json({ ok: true, url: uploaded.url, id: uploaded.key })
    }

    // Fallback: Wix when R2 missing (SHMS-style env on a misconfigured demo).
    try {
      const { uploadMediaBuffer } = await import('@/lib/social/wix-media')
      const uploaded = await uploadMediaBuffer(buffer, {
        mimeType,
        fileName: file.name || `cms-${Date.now()}.jpg`,
      })
      return NextResponse.json({
        ok: true,
        url: uploaded.url,
        id: uploaded.id,
      })
    } catch {
      return NextResponse.json(
        {
          error:
            'Image storage is not configured. Set R2_* on Vercel for demo/trial media uploads.',
        },
        { status: 503 },
      )
    }
  } catch (err) {
    console.error('cms media upload', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
