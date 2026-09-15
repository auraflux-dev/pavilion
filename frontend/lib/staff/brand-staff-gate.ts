import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail, type CompanyProduct } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { resolveFleetProductFromRequest } from '@/lib/crm/fleet-product'
import { workspaceIdForProduct } from '@/lib/staff/seo/workspace'

export type BrandStaffGate = {
  email: string
  demo: boolean
  product: CompanyProduct
  workspaceId: string
}

export async function requireBrandStaff(req: NextRequest): Promise<
  { ok: true; gate: BrandStaffGate } | { ok: false; res: NextResponse }
> {
  const session = await getStaffSession(req)
  if (!session?.staff) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!requireStaffRole(session.staff, 'admin')) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const demo = isDemoInstanceFromRequest(req)
  const email = String(session.staff.email || session.email || '').trim().toLowerCase()
  if (!demo && !(await isPlatformOwnerEmail(email, { demo }))) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const product = resolveFleetProductFromRequest(req, email, { demo })
  const url = req.nextUrl
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() || workspaceIdForProduct(product)
  return { ok: true, gate: { email, demo, product, workspaceId } }
}
