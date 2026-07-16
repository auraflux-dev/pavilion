import { NextRequest, NextResponse } from 'next/server'
import { ACT_AS_COOKIE, isSecure } from '@/lib/auth-cookies'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parentEmail = String(body.parentEmail ?? '').trim().toLowerCase()
  if (!parentEmail.includes('@')) {
    return NextResponse.json({ error: 'parentEmail required' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true, parentEmail })
  res.cookies.set(ACT_AS_COOKIE, encodeURIComponent(parentEmail), {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACT_AS_COOKIE, '', {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
