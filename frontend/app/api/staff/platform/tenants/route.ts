import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail, PLATFORM_CMS_ORG_COOKIE } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { listPlatformTenants, platformFleetAttention } from '@/lib/crm/platform-tenants'
import { PLATFORM_MODE_COOKIE, resolvePlatformMode } from '@/lib/crm/platform-mode'
import { isSecure } from '@/lib/auth-cookies'
import {
  defaultSelectedOrgId,
  FLEET_PRODUCT_COOKIE,
  canSwitchFleetProduct,
  parseCompanyProduct,
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
  const tenants = await listPlatformTenants({ demo, product })
  const attention = await platformFleetAttention({ demo, product })
  const mode = resolvePlatformMode(req.cookies.get(PLATFORM_MODE_COOKIE)?.value, {
    publicDemo: demo,
  })
  const selected =
    req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
    defaultSelectedOrgId({ demo, product })
  const canSwitch = canSwitchFleetProduct({
    host: req.headers.get('host') || undefined,
    email,
    demo,
  })
  const res = NextResponse.json({
    mode,
    product,
    selectedOrganizationId: selected,
    tenants,
    attention,
    canSwitchProduct: canSwitch,
  })
  const requested = parseCompanyProduct(req.nextUrl.searchParams.get('product'))
  if (requested && canSwitch) {
    res.cookies.set(FLEET_PRODUCT_COOKIE, requested, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure(),
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}
