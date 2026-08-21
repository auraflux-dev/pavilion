/**
 * GET /api/programs/preview-unlock?token=SECRET&next=/programs
 * Sets a short-lived cookie so staff/agents can dry-run the public catalog
 * while visitors stay gated until Sunday 4pm Eastern.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PROGRAMS_PREVIEW_COOKIE } from '@/lib/programs/season'
import { previewSecretMatches } from '@/lib/programs/public-access'
import { isSecure } from '@/lib/auth-cookies'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get('token') ?? '').trim()
  const nextPath = String(req.nextUrl.searchParams.get('next') ?? '/programs').trim() || '/programs'
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/programs'

  if (!previewSecretMatches(token)) {
    return NextResponse.json({ error: 'Invalid preview token' }, { status: 403 })
  }

  const url = new URL(safeNext, req.nextUrl.origin)
  const res = NextResponse.redirect(url)
  res.cookies.set(PROGRAMS_PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    // Through Monday morning after public unlock
    maxAge: 60 * 60 * 24 * 4,
  })
  return res
}
