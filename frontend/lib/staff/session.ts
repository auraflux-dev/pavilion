import { NextRequest } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { ACT_AS_COOKIE } from '@/lib/auth-cookies'
import { getStaffProfile, hasStaffRole, type StaffProfile } from '@/lib/staff/roles'

export async function getStaffSession(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return null
  const staff = await getStaffProfile(session.email)
  if (!staff) return null
  return { ...session, staff }
}

export function getActAsEmail(req: NextRequest): string | null {
  const raw = req.cookies.get(ACT_AS_COOKIE)?.value
  if (!raw) return null
  const email = decodeURIComponent(raw).trim().toLowerCase()
  return email.includes('@') ? email : null
}

/**
 * Effective parent email for portal data APIs.
 * Admins may view another parent via act-as cookie.
 */
export async function getEffectiveParentEmail(req: NextRequest): Promise<{
  actorEmail: string
  parentEmail: string
  actingAs: boolean
  staff: StaffProfile | null
  session: NonNullable<Awaited<ReturnType<typeof getMemberSession>>>
} | null> {
  const session = await getMemberSession(req)
  if (!session) return null
  const staff = await getStaffProfile(session.email)
  const actAs = getActAsEmail(req)
  if (actAs && hasStaffRole(staff, 'admin') && actAs !== session.email) {
    return {
      actorEmail: session.email,
      parentEmail: actAs,
      actingAs: true,
      staff,
      session,
    }
  }
  return {
    actorEmail: session.email,
    parentEmail: session.email,
    actingAs: false,
    staff,
    session,
  }
}

export function requireStaffRole(staff: StaffProfile | null, role: Parameters<typeof hasStaffRole>[1]) {
  return hasStaffRole(staff, role)
}
