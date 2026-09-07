import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  PLATFORM_CMS_ORG_COOKIE,
  isPlatformOwnerEmail,
  listCustomerOrganizations,
} from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { isSecure } from '@/lib/auth-cookies'
import { requireOrganizationId } from '@/lib/crm/tenant'
import { PLATFORM_MODE_COOKIE, resolvePlatformMode, type PlatformMode } from '@/lib/crm/platform-mode'
import { writePlatformActivity } from '@/lib/ops/platform-activity'

async function gatePlatform(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return null
  if (!requireStaffRole(session.staff, 'admin')) return null
  const demo = isDemoInstanceFromRequest(req)
  if (demo) return session
  const email = String(session.staff.email || session.email || '').trim().toLowerCase()
  if (!(await isPlatformOwnerEmail(email, { demo }))) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gatePlatform(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const demo = isDemoInstanceFromRequest(req)
  const mode = resolvePlatformMode(req.cookies.get(PLATFORM_MODE_COOKIE)?.value, {
    publicDemo: demo,
  })
  const selected =
    req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
    (demo ? 'org_riverside' : 'org_pavilion')
  return NextResponse.json({ mode, selectedOrganizationId: selected })
}

export async function POST(req: NextRequest) {
  const session = await gatePlatform(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const rawMode = String(body.mode ?? 'platform').trim().toLowerCase()
    const mode: PlatformMode = rawMode === 'client' ? 'client' : 'platform'
    const demo = isDemoInstanceFromRequest(req)
    const orgs = await listCustomerOrganizations({ demo })
    let organizationId =
      String(body.organizationId ?? '').trim() ||
      req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
      ''

    if (mode === 'client') {
      organizationId = requireOrganizationId(organizationId)
      if (!orgs.some((o) => o.id === organizationId)) {
        return NextResponse.json({ error: 'Unknown organization' }, { status: 400 })
      }
      const target = orgs.find((o) => o.id === organizationId)!
      if (
        target.plan === 'vip' ||
        target.slug === 'shms' ||
        target.slug === 'shmspto' ||
        target.slug.includes('stone-hill')
      ) {
        return NextResponse.json(
          { error: 'VIP SHMS is dedicated. Serve it from the SHMS tree, not Platform Staff.' },
          { status: 400 },
        )
      }
    }

    const email = String(session.staff?.email || session.email || '').trim().toLowerCase()
    await writePlatformActivity({
      category: 'ops',
      action: mode === 'client' ? 'platform_enter_client_staff' : 'platform_exit_to_fleet',
      actorKind: 'staff',
      email,
      outcome: 'ok',
      route: '/api/staff/platform/mode',
      organizationId: organizationId || undefined,
      detail: `mode=${mode}`,
    })

    const res = NextResponse.json({
      ok: true,
      mode,
      organizationId: organizationId || null,
    })
    res.cookies.set(PLATFORM_MODE_COOKIE, mode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure(),
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    if (organizationId) {
      res.cookies.set(PLATFORM_CMS_ORG_COOKIE, organizationId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecure(),
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return res
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not set mode' },
      { status: 400 },
    )
  }
}
