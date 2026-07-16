import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { requireStaffRole } from '@/lib/staff/session'
import { getStaffProfile, isStaffEmail, ROLE_HOME_COPY, STAFF_EMAIL_DOMAIN, type StaffRole } from '@/lib/staff/roles'

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  if (!isStaffEmail(session.email)) {
    return NextResponse.json(
      {
        error: `Staff tools require your @${STAFF_EMAIL_DOMAIN} login. You are signed in as ${session.email} — use that personal email in the member portal for your students, and sign in with your @${STAFF_EMAIL_DOMAIN} email for staff work.`,
      },
      { status: 403 },
    )
  }

  const staff = await getStaffProfile(session.email)
  if (!staff) {
    return NextResponse.json(
      {
        error: `No staff role is assigned to ${session.email} yet. Ask the PTO admin to add you in Content Manager → StaffRoles.`,
      },
      { status: 403 },
    )
  }

  const homes = staff.roles.map((role) => ({
    role,
    ...ROLE_HOME_COPY[role as StaffRole],
  }))

  return NextResponse.json({
    email: session.email,
    name: staff.name || `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim(),
    boardTitle: staff.boardTitle,
    roles: staff.roles,
    isAdmin: requireStaffRole(staff, 'admin'),
    homes,
  })
}
