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
import {
  defaultSelectedOrgId,
  resolveFleetProductFromRequest,
} from '@/lib/crm/fleet-product'

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
  const session = await gatePlatform(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const demo = isDemoInstanceFromRequest(req)
  const email = String(session.staff?.email || session.email || '').trim().toLowerCase()
  const product = resolveFleetProductFromRequest(req, email, { demo })
  const orgs = await listCustomerOrganizations({
    demo,
    product,
    includePlatformHome: true,
  })
  const selected =
    req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
    defaultSelectedOrgId({ demo, product })
  return NextResponse.json({
    platformOwner: true,
    product,
    selectedOrganizationId: selected,
    organizations: orgs,
  })
}

export async function POST(req: NextRequest) {
  const session = await gatePlatform(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const organizationId = requireOrganizationId(String(body.organizationId ?? '').trim())
    const demo = isDemoInstanceFromRequest(req)
    const email = String(session.staff?.email || session.email || '').trim().toLowerCase()
    const product = resolveFleetProductFromRequest(req, email, { demo })
    const orgs = await listCustomerOrganizations({
      demo,
      product,
      includePlatformHome: true,
    })
    if (!orgs.some((o) => o.id === organizationId)) {
      return NextResponse.json({ error: 'Unknown organization' }, { status: 400 })
    }
    const res = NextResponse.json({ ok: true, organizationId, product })
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
