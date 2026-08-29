/**
 * Staff site brand API (demo/trial page builder only).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'

async function gate(req: NextRequest) {
  if (!cmsPageBuilderEnabled()) {
    return { error: NextResponse.json({ error: 'Brand editor unavailable' }, { status: 404 }) }
  }
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const { resolveCmsOrganizationId, getCmsSiteBrand } = await import('@/lib/cms/store')
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const brand = await getCmsSiteBrand(orgId)
  return NextResponse.json({ brand: brand ?? null })
}

export async function PUT(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const body = await req.json().catch(() => ({}))
  const { resolveCmsOrganizationId, upsertCmsSiteBrand } = await import('@/lib/cms/store')
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const brand = await upsertCmsSiteBrand(orgId, {
    logoUrl: body.logoUrl != null ? String(body.logoUrl) : undefined,
    faviconUrl: body.faviconUrl != null ? String(body.faviconUrl) : undefined,
    colorPrimary: body.colorPrimary != null ? String(body.colorPrimary) : undefined,
    colorDark: body.colorDark != null ? String(body.colorDark) : undefined,
    colorAccent: body.colorAccent != null ? String(body.colorAccent) : undefined,
    colorWarm: body.colorWarm != null ? String(body.colorWarm) : undefined,
    colorSoft: body.colorSoft != null ? String(body.colorSoft) : undefined,
    fontSans: body.fontSans != null ? String(body.fontSans) : undefined,
    fontDisplay: body.fontDisplay != null ? String(body.fontDisplay) : undefined,
    ptoName: body.ptoName != null ? String(body.ptoName) : undefined,
    schoolName: body.schoolName != null ? String(body.schoolName) : undefined,
    cheer: body.cheer != null ? String(body.cheer) : undefined,
  })
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/', 'layout')
  return NextResponse.json({ brand })
}
