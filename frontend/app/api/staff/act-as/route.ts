import { NextRequest, NextResponse } from 'next/server'
import { ACT_AS_COOKIE, isSecure } from '@/lib/auth-cookies'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { writeStaffAudit } from '@/lib/ops/staff-audit'
import { clientIp } from '@/lib/security/rate-limit'

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

  await writeStaffAudit({
    action: 'act_as_start',
    actorEmail: session?.staff?.email || session?.email || 'unknown',
    targetEmail: parentEmail,
    route: '/api/staff/act-as',
    ip: clientIp(req),
    detail: 'Admin started viewing member portal as parent',
  })

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

export async function DELETE(req: NextRequest) {
  const session = await getStaffSession(req)
  if (session?.staff?.email) {
    await writeStaffAudit({
      action: 'act_as_end',
      actorEmail: session.staff.email || session.email,
      route: '/api/staff/act-as',
      ip: clientIp(req),
      detail: 'Admin exited act-as',
    })
  }

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
