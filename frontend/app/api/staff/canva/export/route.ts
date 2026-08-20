/**
 * POST /api/staff/canva/export — export Canva design as PNG, re-host for email.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getCanvaAccessTokenForStaff } from '@/lib/canva/tokens'
import { waitForDesignPngExport } from '@/lib/canva/client'
import { parseCanvaDesignUrl } from '@/lib/canva/parse-design-url'
import {
  newsletterAssetsConfigured,
  putNewsletterHeroPng,
} from '@/lib/staff/newsletter-assets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'secretary', 'membership', 'admin'])
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    let designId = String(body.designId ?? '').trim()
    const designUrl = String(body.designUrl ?? '').trim()
    if (!designId && designUrl) {
      const parsed = parseCanvaDesignUrl(designUrl)
      designId = parsed?.designId ?? ''
    }
    if (!designId) {
      return NextResponse.json(
        { error: 'Attach a Canva design (designId or designUrl) first.' },
        { status: 400 },
      )
    }

    if (!newsletterAssetsConfigured()) {
      return NextResponse.json(
        {
          error:
            'PNG storage (R2) is not configured on this environment. You can still send with a Canva thumbnail link.',
        },
        { status: 503 },
      )
    }

    const tok = await getCanvaAccessTokenForStaff(session.email)
    if (!tok) {
      return NextResponse.json(
        {
          error:
            'Connect Canva in Staff → Canva (or set CANVA_REFRESH_TOKEN) to export a PNG for email.',
        },
        { status: 401 },
      )
    }

    const { downloadUrl, jobId } = await waitForDesignPngExport(tok.accessToken, designId)
    const imgRes = await fetch(downloadUrl)
    if (!imgRes.ok) {
      throw new Error(`Could not download Canva PNG (${imgRes.status})`)
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    if (buf.length < 100) throw new Error('Canva returned an empty PNG')
    if (buf.length > 12 * 1024 * 1024) {
      throw new Error('Exported PNG is too large (max 12MB). Simplify the Canva design.')
    }

    const stored = await putNewsletterHeroPng(buf, { designId })
    return NextResponse.json({
      ok: true,
      heroImageUrl: stored.url,
      heroImageKey: stored.key,
      designId,
      exportJobId: jobId,
      mode: tok.mode,
    })
  } catch (err) {
    console.error('/api/staff/canva/export POST', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not export Canva PNG. Try again or use thumbnail fallback.',
      },
      { status: 500 },
    )
  }
}
