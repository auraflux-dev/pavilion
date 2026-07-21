/**
 * POST /api/staff/expenses/receipt
 * multipart: file (image/* or application/pdf) → uploads to Wix Media, returns { url }.
 * Any staff can upload receipts for their reimbursement.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { uploadMediaBuffer } from '@/lib/social/wix-media'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED = ['image/', 'application/pdf']

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED.some((a) => mimeType.startsWith(a))) {
      return NextResponse.json(
        { error: 'Only image or PDF receipts are allowed' },
        { status: 400 }
      )
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Receipt must be under 12MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadMediaBuffer(buffer, {
      mimeType,
      fileName: file.name || `receipt-${Date.now()}`,
    })
    return NextResponse.json({ ok: true, url: uploaded.url, name: uploaded.displayName })
  } catch (err) {
    console.error('expense receipt upload', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
