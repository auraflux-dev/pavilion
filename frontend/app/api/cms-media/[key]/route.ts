import { NextRequest, NextResponse } from 'next/server'
import { getCmsMedia, normalizeCmsMediaKey } from '@/lib/cms/cms-media'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = { params: Promise<{ key: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { key: raw } = await params
  const key = normalizeCmsMediaKey(decodeURIComponent(raw || ''))
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const file = await getCmsMedia(key)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(new Uint8Array(file.buf), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
