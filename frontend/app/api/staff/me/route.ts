import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { loadCommonsStaffJson } from '@/lib/crm/commons-staff'
import {
  isStaffEmail,
  resolveStaffForSession,
  ROLE_HOME_COPY,
  STAFF_EMAIL_DOMAIN,
  type StaffRole,
} from '@/lib/staff/roles'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { isSyntheticStagingMode } from '@/lib/fixtures/synthetic-mode'
import { vanillaizeDeep, vanillaizeIfDemo } from '@/lib/demo/brand'
import { getDemoReviewSession } from '@/lib/demo/session'

/**
 * Self-registration: first @shmspto.org login creates a StaffRoles row with no
 * roles so admins just assign roles in Staff → Admin · Staff access (no preload).
 */
async function ensureStaffRegistration(email: string, displayName: string) {
  if (isSyntheticStagingMode()) return
  try {
    const client = getWixClient()
    const existing = await client.items.query('StaffRoles').eq('email', email).limit(5).find()
    if ((existing.items ?? []).some((row) => String(row.email ?? '').trim().toLowerCase() === email)) return
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
  const commons = await loadCommonsStaffJson(req)
  if (commons) return NextResponse.json(commons)

  if (isDemoInstanceFromRequest(req)) {
    const demoStaff = await getStaffSession(req)
    if (demoStaff) {
      const homes = demoStaff.staff.roles.map((role) => ({
        role,
        ...ROLE_HOME_COPY[role as StaffRole],
      }))
      return NextResponse.json(
        vanillaizeDeep({
          email: demoStaff.staff.email,
          sessionEmail: demoStaff.email,
          name: demoStaff.staff.name,
          boardTitle: demoStaff.staff.boardTitle,
          roles: demoStaff.staff.roles,
          personalEmail: demoStaff.staff.personalEmail,
          extraWorkspaces: demoStaff.staff.extraWorkspaces ?? [],
          isAdmin: true,
          platformOwner: true,
          homes,
          demo: true,
        }),
      )
    }
    if (getDemoReviewSession(req)) {
      const demo = getDemoReviewSession(req)!
      const parentOnly = demo.lane === 'parent'
      return NextResponse.json(
        {
          error: vanillaizeIfDemo(
            parentOnly
              ? 'You joined as a parent. Open the staff workspace from the demo banner or /review.'
              : 'Demo session expired or invalid. Rejoin at /review.',
          ),
          code: parentOnly ? 'demo_parent_lane' : 'demo_session_invalid',
        },
        { status: 403 },
      )
    }
    return NextResponse.json(
      { error: 'Sign in to continue.', code: 'sign_in_required' },
      { status: 401 },
    )
  }

  const session = await getMemberSession(req)
  if (!session) {
    return NextResponse.json(
      { error: 'Sign in to continue.', code: 'sign_in_required' },
      { status: 401 },
    )
  }

  const staff = await resolveStaffForSession(session.email, session.emails)
  if (!staff) {
    if (isStaffEmail(session.email) || session.emails.some((e) => isStaffEmail(e))) {
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
    return NextResponse.json(
      {
        error: `Staff tools need your @${STAFF_EMAIL_DOMAIN} login, or a personal email linked on your StaffRoles row. You are signed in as ${session.email}.`,
      },
      { status: 403 },
    )
  }

  const homes = staff.roles.map((role) => ({
    role,
    ...ROLE_HOME_COPY[role as StaffRole],
  }))

  return NextResponse.json({
    email: staff.email,
    sessionEmail: session.email,
    name: staff.name || `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim(),
    boardTitle: staff.boardTitle,
    roles: staff.roles,
    personalEmail: staff.personalEmail || '',
    extraWorkspaces: staff.extraWorkspaces ?? [],
    isAdmin: requireStaffRole(staff, 'admin'),
    homes,
  })
}
