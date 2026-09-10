import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail, PLATFORM_CMS_ORG_COOKIE } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { getPlatformTenant } from '@/lib/crm/platform-tenants'
import { requireOrganizationId } from '@/lib/crm/tenant'
import { resolveFleetProductFromRequest } from '@/lib/crm/fleet-product'

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

type Ctx = { params: Promise<{ orgId: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await gatePlatform(req)
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { orgId: raw } = await ctx.params
  let orgId: string
  try {
    orgId = requireOrganizationId(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid organization' }, { status: 400 })
  }
  const demo = isDemoInstanceFromRequest(req)
  const email = String(session.staff?.email || session.email || '').trim().toLowerCase()
  const product = resolveFleetProductFromRequest(req, email)
  const tenant = await getPlatformTenant(orgId, { demo, product })
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown organization' }, { status: 404 })
  }
  const selected = req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() || ''
  return NextResponse.json({
    product,
    tenant,
    selectedOrganizationId: selected,
    notes: [
      'Notes stay on Platform Staff for operators.',
      'Do not paste parent emails, student names, or payment amounts here.',
    ],
  })
}
