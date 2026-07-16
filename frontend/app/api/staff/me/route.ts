import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { ROLE_HOME_COPY, type StaffRole } from '@/lib/staff/roles'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const homes = session.staff.roles.map((role) => ({
    role,
    ...ROLE_HOME_COPY[role as StaffRole],
  }))

  return NextResponse.json({
    email: session.email,
    name: session.staff.name || `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim(),
    boardTitle: session.staff.boardTitle,
    roles: session.staff.roles,
    isAdmin: requireStaffRole(session.staff, 'admin'),
    homes,
  })
}
