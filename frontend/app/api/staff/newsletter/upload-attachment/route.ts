/**
 * POST /api/staff/newsletter/upload-attachment
 * PDF or PNG attachments for newsletter sends (stored in R2).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  newsletterAssetsConfigured,
  putNewsletterAttachment,
} from '@/lib/staff/newsletter-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
])

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'secretary', 'membership', 'admin'])
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (!newsletterAssetsConfigured()) {
      return NextResponse.json(
        {
          error:
            'File storage (R2) is not configured on this environment. Ask an admin to set R2_* on Vercel.',
        },
        { status: 503 },
      )
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 8MB).' }, { status: 400 })
    }
    const mime = (file.type || '').toLowerCase()
    if (mime && !ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: 'Allowed types: PDF, PNG, or JPEG.' },
        { status: 400 },
      )
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const stored = await putNewsletterAttachment(buf, {
      filename: file.name || 'attachment',
      mimeType: mime || 'application/octet-stream',
    })
    return NextResponse.json({
      ok: true,
      key: stored.key,
      filename: stored.filename,
      mimeType: stored.mimeType,
      url: stored.url,
    })
  } catch (err) {
    console.error('/api/staff/newsletter/upload-attachment POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
