import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail, PLATFORM_CMS_ORG_COOKIE } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { listPlatformTenants, platformFleetAttention } from '@/lib/crm/platform-tenants'
import { PLATFORM_MODE_COOKIE, resolvePlatformMode } from '@/lib/crm/platform-mode'
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
  const product = resolveFleetProductFromRequest(req, email)
  const tenants = await listPlatformTenants({ demo, product })
  const attention = await platformFleetAttention({ demo, product })
  const mode = resolvePlatformMode(req.cookies.get(PLATFORM_MODE_COOKIE)?.value, {
    publicDemo: demo,
  })
  const selected =
    req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() ||
    defaultSelectedOrgId({ demo, product })
  return NextResponse.json({
    mode,
    product,
    selectedOrganizationId: selected,
    tenants,
    attention,
  })
}
