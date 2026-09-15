import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { companyBrandFromHost, isCompanyBrandHost } from '@/lib/crm/product-host'
import { modulesForProduct, type ProductModuleId } from '@/lib/modules/catalog'
import { getOrgModules } from '@/lib/modules/store'
import { resolveCmsOrganizationId } from '@/lib/cms/store'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import type { CompanyProduct } from '@/lib/crm/platform-owners'

export const dynamic = 'force-dynamic'

/**
 * HSKRG platform build surface for brand + customer hosts.
 * Host → product; optional org → enabled modules + brand pack; channel for pin.
 */
export async function GET(req: NextRequest) {
  const h = await headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(':')[0].toLowerCase()
  const product = (companyBrandFromHost(host) || 'pavilion') as CompanyProduct
  const brand = isCompanyBrandHost(host)
  const channel =
    process.env.HSKRG_BUILD_CHANNEL?.trim() ||
    process.env.NEXT_PUBLIC_HSKRG_BUILD_CHANNEL?.trim() ||
    'stable'
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    process.env.HSKRG_BUILD_ID?.trim() ||
    null

  const orgParam = req.nextUrl.searchParams.get('organizationId')?.trim() || ''
  let organizationId = orgParam
  if (!organizationId) {
    try {
      organizationId = (await resolveCmsOrganizationId()) || ''
    } catch {
      organizationId = ''
    }
  }

  let modules: ProductModuleId[] = modulesForProduct(product).map((m) => m.id)
  let brandPackSlug: string | null = null
  let orgName: string | null = null
  let orgSlug: string | null = null

  if (organizationId && commonsDbEnabled()) {
    try {
      modules = await getOrgModules(organizationId)
      const row = await sql<{
        name: string
        slug: string
        brand_pack_slug: string | null
      }>(
        `select name, slug, brand_pack_slug from organizations where id = $1 limit 1`,
        [organizationId],
      )
      const r = row.rows[0]
      if (r) {
        orgName = r.name
        orgSlug = r.slug
        brandPackSlug = (r.brand_pack_slug || '').trim() || null
      }
    } catch {
      /* keep catalog defaults */
    }
  }

  return NextResponse.json({
    ok: true,
    host,
    product,
    surface: brand ? 'brand' : 'customer',
    channel,
    buildId,
    organizationId: organizationId || null,
    organization: organizationId
      ? { id: organizationId, name: orgName, slug: orgSlug, brandPackSlug }
      : null,
    modules,
    catalog: modulesForProduct(product).map((m) => ({
      id: m.id,
      label: m.label,
      group: m.group,
    })),
  })
}
