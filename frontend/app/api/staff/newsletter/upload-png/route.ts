/**
 * POST /api/staff/newsletter/upload-png
 * multipart PNG(s) from Canva Download → R2 newsletter-heroes → email-ready URLs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  newsletterAssetsConfigured,
  putNewsletterHeroPng,
} from '@/lib/staff/newsletter-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 12 * 1024 * 1024
const MAX_PAGES = 12

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'secretary', 'membership', 'admin'])
}

function pngFiles(form: FormData): File[] {
  const fromFiles = form
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (fromFiles.length) return fromFiles
  const single = form.get('file')
  return single instanceof File && single.size > 0 ? [single] : []
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
            'PNG storage (R2) is not configured on this environment. Ask an admin to set R2_* on Vercel.',
        },
        { status: 503 },
      )
    }

    const form = await req.formData()
    const files = pngFiles(form)
    if (!files.length) {
      return NextResponse.json({ error: 'Choose one or more PNG files to upload.' }, { status: 400 })
    }
    if (files.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `At most ${MAX_PAGES} PNG pages per newsletter.` },
        { status: 400 },
      )
    }

    const pageImageUrls: string[] = []
    const pageImageKeys: string[] = []

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      const mime = (file.type || '').toLowerCase()
      if (mime && mime !== 'image/png') {
        return NextResponse.json(
          { error: `Page ${i + 1} must be PNG. In Canva use Share → Download → PNG.` },
          { status: 400 },
        )
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `Page ${i + 1} is too large (max 12MB). Simplify the Canva design.` },
          { status: 400 },
        )
      }
      const buf = Buffer.from(await file.arrayBuffer())
      if (buf.length < 100) {
        return NextResponse.json({ error: `Page ${i + 1} looks empty.` }, { status: 400 })
      }
      const stored = await putNewsletterHeroPng(buf, { designId: `upload-p${i + 1}` })
      pageImageUrls.push(stored.url)
      pageImageKeys.push(stored.key)
    }

    return NextResponse.json({
      ok: true,
      heroImageUrl: pageImageUrls[0],
      heroImageKey: pageImageKeys[0],
      pageImageUrls,
      pageImageKeys,
      pageCount: pageImageUrls.length,
    })
  } catch (err) {
    console.error('/api/staff/newsletter/upload-png POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PNG upload failed' },
      { status: 500 },
    )
  }
}
