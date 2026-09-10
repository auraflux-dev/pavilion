import { NextRequest, NextResponse } from 'next/server'
import { liveCommerceGate } from '@/lib/crm/commerce-gate'
import {
  COMMONS_COMMERCE_GATED_WORKSPACES,
  COMMONS_DEMO_HIDDEN_WORKSPACES,
  filterSurfaceWorkspaces,
} from '@/lib/demo/commons-surface'
import { isDemoInstanceFromRequest, hostFromRequest } from '@/lib/demo/instance'
import { companyBrandFromHost } from '@/lib/crm/product-host'
import { platformBrandForEmail } from '@/lib/crm/platform-owners'
import { resolveFleetProduct } from '@/lib/crm/fleet-product'
import { BR_PTO_FAT_WORKSPACES } from '@/lib/staff/br-staff-surface'
import { getStaffSession } from '@/lib/staff/session'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { organizationIdFromHostHeader } from '@/lib/crm/tenant'
import { PLATFORM_CMS_ORG_COOKIE } from '@/lib/crm/platform-owners'

export const dynamic = 'force-dynamic'

async function resolveOrgProduct(orgId: string | null): Promise<'pavilion' | 'businessrocket' | null> {
  if (!orgId || !commonsDbEnabled()) return null
  try {
    const found = await sql<{ product: string | null }>(
      `select coalesce(product, 'pavilion') as product from organizations where id = $1 limit 1`,
      [orgId],
    )
    const p = found.rows[0]?.product
    return p === 'businessrocket' ? 'businessrocket' : p ? 'pavilion' : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const gate = await liveCommerceGate(req)
  const demo = isDemoInstanceFromRequest(req)
  const host = hostFromRequest(req)
  const session = await getStaffSession(req)
  const email = String(session?.staff?.email || session?.email || '')
    .trim()
    .toLowerCase()

  const cookieOrg = req.cookies.get(PLATFORM_CMS_ORG_COOKIE)?.value?.trim() || null
  const hostOrg = await organizationIdFromHostHeader(req)
  const orgProduct = await resolveOrgProduct(cookieOrg || hostOrg)
  const product =
    orgProduct ||
    resolveFleetProduct({ host, email }) ||
    companyBrandFromHost(host) ||
    platformBrandForEmail(email) ||
    'pavilion'

  const baseHidden = filterSurfaceWorkspaces(
    demo ? COMMONS_DEMO_HIDDEN_WORKSPACES : gate.liveCommerce ? [] : COMMONS_COMMERCE_GATED_WORKSPACES,
  )
  const hiddenStaffWorkspaces =
    product === 'businessrocket'
      ? filterSurfaceWorkspaces([...baseHidden, ...BR_PTO_FAT_WORKSPACES])
      : baseHidden

  return NextResponse.json({
    liveCommerce: gate.liveCommerce,
    reason: gate.reason,
    note: gate.note,
    hiddenStaffWorkspaces,
    demo,
    product,
    brandStaff: product === 'businessrocket' && Boolean(companyBrandFromHost(host) || platformBrandForEmail(email)),
  })
}
