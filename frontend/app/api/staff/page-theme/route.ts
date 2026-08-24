import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { PAGE_CONTENT_DEFAULTS } from '@/lib/defaults/page-content'
import { SITE_PAGE_THEME_REGISTRY } from '@/lib/defaults/site-string-registry'
import { pageThemeClassName } from '@/lib/copy/page-custom-css'
import { revalidatePublicPage } from '@/lib/staff/revalidate-public'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['admin', 'marketing'])) {
    return null
  }
  return session
}

function mapThemeRow(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    page: String(item.page ?? ''),
    customCss: String(item.customCss ?? ''),
    stringOverrides: String(item.stringOverrides ?? ''),
    active: item.active !== false,
  }
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const result = await client.items.query('PageContent').ascending('page').limit(100).find()
    const byPage = new Map(
      (result.items ?? []).map((i) => {
        const row = mapThemeRow(i as Record<string, unknown>)
        return [row.page, row] as const
      }),
    )

    const pages = SITE_PAGE_THEME_REGISTRY.map((entry) => {
      const cms = byPage.get(entry.page)
      const defaults = PAGE_CONTENT_DEFAULTS[entry.page]
      return {
        ...entry,
        id: cms?.id ?? '',
        customCss: cms?.customCss ?? defaults?.customCss ?? '',
        stringOverrides: cms?.stringOverrides ?? defaults?.stringOverrides ?? '',
        fromDefault: !cms?.id,
        scopeClass: pageThemeClassName(entry.page),
      }
    })

    return NextResponse.json({
      pages,
      canEdit: true,
    })
  } catch (err) {
    console.error('/api/staff/page-theme GET', err)
    return NextResponse.json({ error: 'Could not load page theme' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const page = String(body.page ?? '').trim()
    if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 })

    const entry = SITE_PAGE_THEME_REGISTRY.find((e) => e.page === page)
    if (!entry) {
      return NextResponse.json({ error: 'Unknown page key' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { page, active: true }
    if (body.customCss != null) patch.customCss = String(body.customCss ?? '')
    if (body.stringOverrides != null) {
      patch.stringOverrides = String(body.stringOverrides ?? '').trim()
    }

    const client = getWixClient()
    const id = String(body.id ?? '').trim()
    if (id) {
      const existing = (await client.items.get('PageContent', id)) as Record<string, unknown>
      await client.items.update('PageContent', {
        ...existing,
        ...patch,
        _id: id,
      } as Parameters<typeof client.items.update>[1])
      revalidatePublicPage(page)
      return NextResponse.json({ ok: true, id })
    }

    const found = await client.items.query('PageContent').eq('page', page).limit(1).find()
    const existing = found.items?.[0] as Record<string, unknown> | undefined
    if (existing?._id) {
      await client.items.update('PageContent', {
        ...existing,
        ...patch,
        _id: existing._id,
      } as Parameters<typeof client.items.update>[1])
      revalidatePublicPage(page)
      return NextResponse.json({ ok: true, id: existing._id })
    }

    const defaults = PAGE_CONTENT_DEFAULTS[page]
    const inserted = await client.items.insert('PageContent', {
      page,
      eyebrow: defaults?.eyebrow ?? '',
      title: defaults?.title ?? '',
      body: defaults?.body ?? '',
      sectionTitle: defaults?.sectionTitle ?? '',
      sectionBody: defaults?.sectionBody ?? '',
      bullets: (defaults?.bullets ?? []).join('\n'),
      ctaLabel: defaults?.ctaLabel ?? '',
      ctaHref: defaults?.ctaHref ?? '',
      flyerImage: defaults?.flyerImage ?? '',
      customCss: String(patch.customCss ?? ''),
      stringOverrides: String(patch.stringOverrides ?? ''),
      active: true,
    })
    revalidatePublicPage(page)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error('/api/staff/page-theme PATCH', err)
    return NextResponse.json({ error: 'Could not save page theme' }, { status: 500 })
  }
}
