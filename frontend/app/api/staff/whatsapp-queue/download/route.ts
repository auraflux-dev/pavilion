/**
 * GET /api/staff/whatsapp-queue/download?url=&fileName=
 * Proxies a stored attachment so Confirm can force a Save/Download on phone/desktop.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeFileName(raw: string): string {
  const cleaned = raw.replace(/[^\w.\- ()[\]]+/g, '_').trim()
  return cleaned.slice(0, 120) || 'whatsapp-attachment'
}

export async function GET(req: NextRequest) {
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

  const url = String(req.nextUrl.searchParams.get('url') || '').trim()
  const fileName = safeFileName(
    String(req.nextUrl.searchParams.get('fileName') || 'attachment'),
  )
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid attachment URL' }, { status: 400 })
  }
  // Only proxy our usual public media hosts (Wix / site CDN).
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid attachment URL' }, { status: 400 })
  }
  const allowedHost =
    host.endsWith('.wixstatic.com') ||
    host.endsWith('.wixmp.com') ||
    host === 'static.wixstatic.com' ||
    host.endsWith('.shmspto.org')
  if (!allowedHost) {
    return NextResponse.json({ error: 'Attachment host not allowed' }, { status: 400 })
  }

  try {
    const upstream = await fetch(url, { redirect: 'follow' })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Could not fetch attachment (${upstream.status})` },
        { status: 502 },
      )
    }
    const bytes = await upstream.arrayBuffer()
    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream'
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    console.error('whatsapp-queue download', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Download failed' },
      { status: 500 },
    )
  }
}
