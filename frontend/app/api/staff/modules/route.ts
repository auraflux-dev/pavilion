import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isPlatformOwnerEmail } from '@/lib/crm/platform-owners'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import {
  MODULE_CATALOG,
  MODULE_GROUP_LABEL,
  MODULE_PRESETS,
  modulesForProduct,
  sanitizeEnabledModules,
  type ModuleProduct,
  type ProductModuleId,
} from '@/lib/modules/catalog'
import {
  defaultModulesForRequest,
  getOrgModules,
  resolveModulesOrgId,
  setOrgModules,
} from '@/lib/modules/store'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const demo = isDemoInstanceFromRequest(req)
  const platform = await isPlatformOwnerEmail(session.email, { demo })
  const admin = requireStaffRole(session.staff, ['admin'])
  if (!platform && !admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, platform }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const productRaw = String(req.nextUrl.searchParams.get('product') ?? 'pavilion').trim() || 'pavilion'
  const product: ModuleProduct =
    productRaw === 'businessrocket' || productRaw === 'auraflux' || productRaw === 'pavilion'
      ? productRaw
      : 'pavilion'
  const catalog = modulesForProduct(product)
  const orgId = await resolveModulesOrgId(req)
  const enabled = orgId
    ? await getOrgModules(orgId)
    : defaultModulesForRequest(req)

  return NextResponse.json({
    product,
    catalog,
    groups: MODULE_GROUP_LABEL,
    presets: MODULE_PRESETS.filter((p) => p.product === product || product === 'pavilion'),
    enabled,
    orgId,
    allCatalogCount: MODULE_CATALOG.length,
  })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const orgId = await resolveModulesOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  if (body.presetId) {
    const preset = MODULE_PRESETS.find((p) => p.id === String(body.presetId))
    if (!preset) return NextResponse.json({ error: 'Unknown preset' }, { status: 400 })
    const enabled = await setOrgModules(orgId, preset.modules)
    return NextResponse.json({ ok: true, enabled })
  }

  const modules = Array.isArray(body.modules)
    ? (body.modules.map((m: unknown) => String(m)) as ProductModuleId[])
    : []
  const enabled = await setOrgModules(orgId, sanitizeEnabledModules(modules))
  return NextResponse.json({ ok: true, enabled })
}
