import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import { requireStaffRole } from '@/lib/staff/session'
import { getStaffProfile, isStaffEmail, ROLE_HOME_COPY, STAFF_EMAIL_DOMAIN, type StaffRole } from '@/lib/staff/roles'

/**
 * Self-registration: first @shmspto.org login creates a StaffRoles row with no
 * roles so admins just assign roles in Staff → Admin · Staff access (no preload).
 */
async function ensureStaffRegistration(email: string, displayName: string) {
  try {
    const client = getWixClient()
    const existing = await client.items.query('StaffRoles').eq('email', email).limit(1).find()
    if (existing.items.length > 0) return
    await client.items.insert('StaffRoles', {
      email,
      name: displayName,
      boardTitle: '',
      roles: '',
      active: true,
    })
  } catch (err) {
    console.warn('StaffRoles self-registration failed:', err)
  }
}

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  if (!isStaffEmail(session.email)) {
    return NextResponse.json(
      {
        error: `Staff tools require your @${STAFF_EMAIL_DOMAIN} login. You are signed in as ${session.email}. use that personal email in the member portal for your students, and sign in with your @${STAFF_EMAIL_DOMAIN} email for staff work.`,
      },
      { status: 403 },
    )
  }

  const staff = await getStaffProfile(session.email)
  if (!staff) {
    const displayName = `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    await ensureStaffRegistration(session.email.trim().toLowerCase(), displayName)
    return NextResponse.json(
      {
        error: `You're registered as ${session.email}, but no role is assigned yet. Ask the PTO admin to assign your role in Staff → Admin · Staff access.`,
        registered: true,
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
    personalEmail: staff.personalEmail || '',
    isAdmin: requireStaffRole(staff, 'admin'),
    homes,
  })
}
