/**
 * POST { url } → suggest logo / colors from a public school or PTO site.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'
import { suggestBrandFromUrl } from '@/lib/staff/suggest-brand-from-url'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!cmsPageBuilderEnabled()) {
    return NextResponse.json({ error: 'Brand suggest unavailable' }, { status: 404 })
  }
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const url = String(body.url || '').trim()
  if (!url) {
    return NextResponse.json({ error: 'Paste a school or PTO website URL.' }, { status: 400 })
  }

  try {
    const suggestion = await suggestBrandFromUrl(url)
    return NextResponse.json({ suggestion })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not scan that URL'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
