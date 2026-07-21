/**
 * POST /api/staff/cove/products/image
 * multipart: productId + file (image/*)
 * Uploads to Wix Media Manager and sets product main image.
 */
import { NextRequest, NextResponse } from 'next/server'
import { uploadStaffCoveProductImage } from '@/lib/staff/cove-products'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const productId = String(form.get('productId') ?? '').trim()
    const file = form.get('file')
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    const mimeType = file.type || 'image/jpeg'
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const product = await uploadStaffCoveProductImage(productId, {
      buffer,
      mimeType,
      fileName: file.name || `cove-${productId}.jpg`,
    })
    return NextResponse.json({ ok: true, product })
  } catch (err) {
    console.error('cove product image', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
