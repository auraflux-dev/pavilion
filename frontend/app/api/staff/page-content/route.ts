import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  COVE_PAGE_CONTENT_KEYS,
  isCovePageContentKey,
  PAGE_CONTENT_DEFAULTS,
} from '@/lib/defaults/page-content'
import { STAFF_ROLES, type StaffProfile } from '@/lib/staff/roles'
import { vanillaizeCopy } from '@/lib/demo/brand'
import { DEMO_PAGES } from '@/lib/demo/content'
import { isDemoInstance } from '@/lib/demo/instance'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, [...STAFF_ROLES])) {
    return null
  }
  return session
}

function canEditAllPageCopy(staff: StaffProfile | null) {
  return requireStaffRole(staff, [...STAFF_ROLES])
}

function canEditPageCopy(staff: StaffProfile | null, page: string) {
  if (canEditAllPageCopy(staff)) return true
  return requireStaffRole(staff, 'retail') && isCovePageContentKey(page)
}

function mapRow(item: Record<string, unknown>) {
  return {
    id: String(item._id ?? ''),
    page: String(item.page ?? ''),
    eyebrow: String(item.eyebrow ?? ''),
    title: String(item.title ?? ''),
    body: String(item.body ?? ''),
    sectionTitle: String(item.sectionTitle ?? ''),
    sectionBody: String(item.sectionBody ?? ''),
    bullets: String(item.bullets ?? ''),
    ctaLabel: String(item.ctaLabel ?? ''),
    ctaHref: String(item.ctaHref ?? ''),
    flyerImage: String(item.flyerImage ?? ''),
    active: item.active !== false,
  }
}

function pageRowFromFields(
  page: string,
  fields: {
    eyebrow?: string
    title?: string
    body?: string
    sectionTitle?: string
    sectionBody?: string
    bullets?: string[] | string
    ctaLabel?: string
    ctaHref?: string
    flyerImage?: string
  },
  fromDefault = false,
) {
  const bullets = Array.isArray(fields.bullets)
    ? fields.bullets.join('\n')
    : String(fields.bullets ?? '')
  return {
    id: '',
    page,
    eyebrow: fields.eyebrow ?? '',
    title: fields.title ?? '',
    body: fields.body ?? '',
    sectionTitle: fields.sectionTitle ?? '',
    sectionBody: fields.sectionBody ?? '',
    bullets,
    ctaLabel: fields.ctaLabel ?? '',
    ctaHref: fields.ctaHref ?? '',
    flyerImage: fields.flyerImage ?? '',
    active: true,
    ...(fromDefault ? { fromDefault: true } : {}),
  }
}

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const staff = session.staff
    const allPages = canEditAllPageCopy(staff)
    const defaultKeys = allPages
      ? Object.keys(PAGE_CONTENT_DEFAULTS)
      : [...COVE_PAGE_CONTENT_KEYS]

    let merged
    if (isDemoInstance()) {
      const known = new Set(Object.keys(DEMO_PAGES))
      const fromDemo = Object.entries(DEMO_PAGES).map(([page, fields]) =>
        pageRowFromFields(page, fields),
      )
      const missing = defaultKeys
        .filter((page) => !known.has(page))
        .map((page) => pageRowFromFields(page, PAGE_CONTENT_DEFAULTS[page] ?? {}, true))
      merged = [...fromDemo, ...missing]
      if (!allPages) {
        merged = merged.filter((p) => isCovePageContentKey(p.page))
      }
      merged = merged.map((p) => ({
        ...p,
        eyebrow: vanillaizeCopy(p.eyebrow),
        title: vanillaizeCopy(p.title),
        body: vanillaizeCopy(p.body),
        sectionTitle: vanillaizeCopy(p.sectionTitle),
        sectionBody: vanillaizeCopy(p.sectionBody),
        bullets: vanillaizeCopy(p.bullets),
        ctaLabel: vanillaizeCopy(p.ctaLabel),
      }))
    } else {
      const client = getWixClient()
      const result = await client.items.query('PageContent').ascending('page').limit(100).find()
      const pages = (result.items ?? []).map((i) => mapRow(i as Record<string, unknown>))
      const known = new Set(pages.map((p) => p.page))
      const missing = defaultKeys
        .filter((page) => !known.has(page))
        .map((page) => pageRowFromFields(page, PAGE_CONTENT_DEFAULTS[page] ?? {}, true))
      merged = [...pages, ...missing]
      if (!allPages) {
        merged = merged.filter((p) => isCovePageContentKey(p.page))
      }
    }

    return NextResponse.json({
      pages: merged,
      scope: allPages ? 'all' : 'cove',
      canBrandFix: allPages && !isDemoInstance(),
      demo: isDemoInstance(),
    })
  } catch (err) {
    console.error('/api/staff/page-content GET', err)
    return NextResponse.json({ error: 'Could not load page copy' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const page = String(body.page ?? '').trim()
    if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 })
    if (!canEditPageCopy(session.staff, page)) {
      return NextResponse.json(
        { error: 'Retail may only edit Cove page copy (store, store-how, store-cta, spirit-wear)' },
        { status: 403 },
      )
    }

    const row = {
      page,
      eyebrow: String(body.eyebrow ?? '').trim(),
      title: String(body.title ?? '').trim(),
      body: String(body.body ?? '').trim(),
      sectionTitle: String(body.sectionTitle ?? '').trim(),
      sectionBody: String(body.sectionBody ?? '').trim(),
      bullets: Array.isArray(body.bullets)
        ? body.bullets.join('\n')
        : String(body.bullets ?? '').trim(),
      ctaLabel: String(body.ctaLabel ?? '').trim(),
      ctaHref: String(body.ctaHref ?? '').trim(),
      flyerImage: String(body.flyerImage ?? '').trim(),
      active: body.active !== false,
    }

    const client = getWixClient()
    const id = String(body.id ?? '').trim()
    if (id) {
      const existing = (await client.items.get('PageContent', id)) as Record<string, unknown>
      await client.items.update('PageContent', {
        ...existing,
        ...row,
        _id: id,
      } as Parameters<typeof client.items.update>[1])
      return NextResponse.json({ ok: true, id })
    }

    const found = await client.items.query('PageContent').eq('page', page).limit(1).find()
    const existing = found.items?.[0] as { _id?: string } | undefined
    if (existing?._id) {
      await client.items.update('PageContent', {
        ...existing,
        ...row,
        _id: existing._id,
      } as Parameters<typeof client.items.update>[1])
      return NextResponse.json({ ok: true, id: existing._id })
    }

    const inserted = await client.items.insert('PageContent', row)
    return NextResponse.json({ ok: true, id: (inserted as { _id?: string })._id })
  } catch (err) {
    console.error('/api/staff/page-content PATCH', err)
    return NextResponse.json({ error: 'Could not save page copy' }, { status: 500 })
  }
}
