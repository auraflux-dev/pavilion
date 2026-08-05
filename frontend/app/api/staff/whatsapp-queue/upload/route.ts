/**
 * POST /api/staff/whatsapp-queue/upload
 * multipart file → Wix Media → attachment metadata for the grade queue.
 * Images, PDF, and MP4 (WhatsApp-friendly). Meta still cannot auto-attach.
 */
import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaBuffer } from '@/lib/social/wix-media'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  isAllowedWhatsAppAttachmentMime,
  WHATSAPP_ATTACHMENT_MAX_BYTES,
} from '@/lib/staff/whatsapp-queue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (
    !requireStaffRole(session?.staff ?? null, [
      'membership',
      'secretary',
      'marketing',
      'admin',
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
    const mimeType = file.type || 'application/octet-stream'
    if (!isAllowedWhatsAppAttachmentMime(mimeType)) {
      return NextResponse.json(
        { error: 'Allowed: JPEG, PNG, WebP, GIF, PDF, or MP4' },
        { status: 400 },
      )
    }
    if (file.size > WHATSAPP_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 12MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadMediaBuffer(buffer, {
      mimeType,
      fileName: file.name || `whatsapp-${Date.now()}`,
    })
    return NextResponse.json({
      ok: true,
      attachment: {
        url: uploaded.url,
        fileName: uploaded.displayName || file.name || 'attachment',
        mimeType,
        size: file.size,
      },
    })
  } catch (err) {
    console.error('whatsapp-queue upload', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
