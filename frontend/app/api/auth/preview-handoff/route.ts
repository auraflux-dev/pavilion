/**
 * Completes Google (www) → Preview session handoff.
 * GET with ?t= is supported for short payloads; POST is preferred.
 */
import { NextRequest, NextResponse } from 'next/server'
import { TOKENS_COOKIE, TOKEN_MAX_AGE, isSecure } from '@/lib/auth-cookies'
import { safeReturnTo } from '@/lib/auth-google-member'
import { verifyPreviewHandoff } from '@/lib/auth-preview-handoff'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function originFromRequest(req: NextRequest): string {
  const host = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim()
  if (host.includes('localhost') || host.startsWith('127.')) {
    return `http://${host}`
  }
  return `https://${host.split(':')[0]}`
}

function finish(req: NextRequest, raw: string) {
  const origin = originFromRequest(req)
  const payload = verifyPreviewHandoff(raw)
  if (!payload) {
    const fail = new URL('/auth/join', origin)
    fail.searchParams.set('mode', 'login')
    fail.searchParams.set('error', 'google_state_mismatch')
    return NextResponse.redirect(fail, 302)
  }

  const returnTo = safeReturnTo(payload.returnTo)
  const res = NextResponse.redirect(new URL(returnTo, origin), 302)
  res.cookies.set(TOKENS_COOKIE, JSON.stringify(payload.tokens), {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  })
  return res
}

export async function GET(req: NextRequest) {
  return finish(req, req.nextUrl.searchParams.get('t') || '')
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  let raw = ''
  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => ({}))) as { t?: string }
    raw = String(body.t || '')
  } else {
    const form = await req.formData().catch(() => null)
    raw = String(form?.get('t') || '')
  }
  return finish(req, raw)
}
