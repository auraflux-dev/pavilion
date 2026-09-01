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
  const orgs = await listCustomerOrganizations({ demo })
  const selected =
    req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
    (demo ? 'org_riverside' : 'org_pavilion')
  return NextResponse.json({
    platformOwner: true,
    selectedOrganizationId: selected,
    organizations: orgs,
  })
}

export async function POST(req: NextRequest) {
  if (!(await gatePlatform(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const organizationId = requireOrganizationId(String(body.organizationId ?? '').trim())
    const demo = isDemoInstanceFromRequest(req)
    const orgs = await listCustomerOrganizations({ demo })
    if (!orgs.some((o) => o.id === organizationId)) {
      return NextResponse.json({ error: 'Unknown organization' }, { status: 400 })
    }
    const res = NextResponse.json({ ok: true, organizationId })
    res.cookies.set(PLATFORM_CMS_ORG_COOKIE, organizationId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure(),
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not set organization' },
      { status: 400 },
    )
  }
}
