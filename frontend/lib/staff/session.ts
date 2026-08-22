import { NextRequest } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { ACT_AS_COOKIE } from '@/lib/auth-cookies'
import {
  hasStaffRole,
  resolveStaffForSession,
  type StaffProfile,
} from '@/lib/staff/roles'
import { staffCanWorkspace } from '@/lib/staff/permissions'
import type { StaffWorkspace } from '@/lib/audience'
import { commonsStaffProfile, loadCommonsStaffJson } from '@/lib/crm/commons-staff'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { isDemoInstance } from '@/lib/demo/instance'
import { demoStaffProfile, getDemoReviewSession } from '@/lib/demo/session'

function commonsStaffSession(
  commons: NonNullable<Awaited<ReturnType<typeof loadCommonsStaffJson>>>,
) {
  const staff = commonsStaffProfile(commons)
  const [firstName = '', ...rest] = commons.name.split(' ')
  const lastName = rest.join(' ')
  return {
    email: commons.email,
    emails: [commons.email],
    memberId: `commons:${commons.email}`,
    member: {
      _id: `commons:${commons.email}`,
      loginEmail: commons.email,
      contact: { firstName, lastName },
      profile: {},
    },
    tokens: null,
    oauthClient: null,
    staff,
    commons: true as const,
  }
}

export async function getStaffSession(req: NextRequest) {
  if (isCommonsPlatformHost()) {
    const commons = await loadCommonsStaffJson(req)
    if (commons) return commonsStaffSession(commons)
  }

  if (isDemoInstance()) {
    const demo = getDemoReviewSession(req)
    if (demo && (demo.lane === 'staff' || demo.lane === 'both')) {
      const session = await getMemberSession(req)
      if (!session) return null
      return { ...session, staff: demoStaffProfile(demo) }
    }
  }
  const session = await getMemberSession(req)
  if (!session) return null
  const staff = await resolveStaffForSession(session.email, session.emails)
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
 * - Admin act-as cookie → that parent (read-only UI)
 * - Staff with linked personalEmail → household data for Member view
 * - Otherwise → signed-in email
 */
export async function getEffectiveParentEmail(req: NextRequest): Promise<{
  actorEmail: string
  parentEmail: string
  actingAs: boolean
  linkedHousehold: boolean
  staff: StaffProfile | null
  session: NonNullable<Awaited<ReturnType<typeof getMemberSession>>>
} | null> {
  const session = await getMemberSession(req)
  if (!session) return null
  const staff = await resolveStaffForSession(session.email, session.emails)
  const actAs = getActAsEmail(req)
  if (actAs && hasStaffRole(staff, 'admin') && actAs !== session.email) {
    return {
      actorEmail: session.email,
      parentEmail: actAs,
      actingAs: true,
      linkedHousehold: false,
      staff,
      session,
    }
  }

  const linked = staff?.personalEmail?.trim().toLowerCase() || ''
  if (linked && linked.includes('@')) {
    return {
      actorEmail: session.email,
      parentEmail: linked,
      actingAs: false,
      linkedHousehold: linked !== session.email,
      staff,
      session,
    }
  }

  return {
    actorEmail: session.email,
    parentEmail: session.email,
    actingAs: false,
    linkedHousehold: false,
    staff,
    session,
  }
}

export function requireStaffRole(staff: StaffProfile | null, role: Parameters<typeof hasStaffRole>[1]) {
  return hasStaffRole(staff, role)
}

export function requireStaffRoleOrWorkspace(
  staff: StaffProfile | null,
  roles: Parameters<typeof hasStaffRole>[1],
  workspaces: StaffWorkspace[],
) {
  if (hasStaffRole(staff, roles)) return true
  if (!staff) return false
  return workspaces.some((ws) => staffCanWorkspace(staff, ws))
}
