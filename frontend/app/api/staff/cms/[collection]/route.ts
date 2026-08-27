import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  STAFF_CMS_COLLECTIONS,
  buildCmsPayload,
  listCollection,
  mapCmsRow,
} from '@/lib/staff/cms-catalog'

type Ctx = { params: Promise<{ collection: string }> }

function resolveConfig(collection: string) {
  const key = Object.keys(STAFF_CMS_COLLECTIONS).find(
    (k) => k.toLowerCase() === collection.toLowerCase(),
  )
  return key ? STAFF_CMS_COLLECTIONS[key] : null
}

async function gate(req: NextRequest, collection: string) {
  const session = await getStaffSession(req)
  if (!session) return null
  const config = resolveConfig(collection)
  if (!config) return null
  if (!requireStaffRole(session.staff, [...config.roles, 'admin'])) return null
  return { session, config }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params
  const gated = await gate(req, collection)
  if (!gated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { config } = gated
  try {
    const { pavilionCmsEnabled, resolveCmsOrganizationId, listCmsNavLinks } =
      await import('@/lib/cms/store')
    if (pavilionCmsEnabled() && config.id === 'NavLinks') {
      const orgId = await resolveCmsOrganizationId(req)
      const links = orgId ? await listCmsNavLinks(orgId, false) : []
      const items = links.map((l) =>
        mapCmsRow(
          {
            _id: l.id,
            label: l.label,
            href: l.href,
            sortOrder: l.sortOrder,
            showInNav: l.showInNav,
            showInFooter: l.showInFooter,
            active: l.active,
          },
          config.fields,
        ),
      )
      return NextResponse.json({
        collection: config.id,
        label: config.label,
        fields: config.fields,
        items,
        backend: 'pavilion-cms',
      })
    }
    const items = await listCollection(config.id, config.sortField ?? 'sortOrder')
    return NextResponse.json({
      collection: config.id,
      label: config.label,
      fields: config.fields,
      items: items.map((i) => mapCmsRow(i, config.fields)),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/WDE0025|does not exist/i.test(msg)) {
      return NextResponse.json({
        collection: config.id,
        label: config.label,
        fields: config.fields,
        items: [],
        missingCollection: true,
        hint: 'Collection missing. Use Staff → Help → Create KbArticles collection (or Site CMS ensure-fields).',
      })
    }
    console.error(`/api/staff/cms/${collection} GET`, err)
    return NextResponse.json({ error: 'Could not load collection' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params
  const gated = await gate(req, collection)
  if (!gated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { config } = gated
  try {
    const body = await req.json()
    const row = buildCmsPayload(body, config.fields)
    if (config.activeField && row[config.activeField] === undefined) {
      row[config.activeField] = true
    }
    const { pavilionCmsEnabled, resolveCmsOrganizationId, upsertCmsNavLink } =
      await import('@/lib/cms/store')
    if (pavilionCmsEnabled() && config.id === 'NavLinks') {
      const orgId = await resolveCmsOrganizationId(req)
      if (!orgId) {
        return NextResponse.json({ error: 'Organization required for Pavilion CMS' }, { status: 400 })
      }
      const saved = await upsertCmsNavLink(orgId, {
        label: String(row.label ?? ''),
        href: String(row.href ?? ''),
        sortOrder: Number(row.sortOrder ?? 99) || 99,
        showInNav: row.showInNav !== false,
        showInFooter: row.showInFooter === true,
        active: row.active !== false,
      })
      return NextResponse.json({ ok: true, id: saved.id, backend: 'pavilion-cms' })
    }
    const client = getWixClient()
    const inserted = await client.items.insert(config.id, row)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error(`/api/staff/cms/${collection} POST`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params
  const gated = await gate(req, collection)
  if (!gated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { config } = gated
  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const row = buildCmsPayload(body, config.fields)
    const { pavilionCmsEnabled, resolveCmsOrganizationId, upsertCmsNavLink } =
      await import('@/lib/cms/store')
    if (pavilionCmsEnabled() && config.id === 'NavLinks') {
      const orgId = await resolveCmsOrganizationId(req)
      if (!orgId) {
        return NextResponse.json({ error: 'Organization required for Pavilion CMS' }, { status: 400 })
      }
      await upsertCmsNavLink(orgId, {
        id,
        label: String(row.label ?? ''),
        href: String(row.href ?? ''),
        sortOrder: Number(row.sortOrder ?? 99) || 99,
        showInNav: row.showInNav !== false,
        showInFooter: row.showInFooter === true,
        active: row.active !== false,
      })
      return NextResponse.json({ ok: true, id, backend: 'pavilion-cms' })
    }
    const client = getWixClient()
    const existing = await client.items.get(config.id, id)
    await client.items.update(config.id, {
      ...(existing as object),
      ...row,
      _id: id,
    } as Parameters<typeof client.items.update>[1])
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error(`/api/staff/cms/${collection} PATCH`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not save' },
      { status: 400 },
    )
  }
}
