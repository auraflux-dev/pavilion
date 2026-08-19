import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  COVE_PAGE_CONTENT_KEYS,
  isCovePageContentKey,
  PAGE_CONTENT_DEFAULTS,
} from '@/lib/defaults/page-content'
import type { StaffProfile } from '@/lib/staff/roles'
import { vanillaizeCopy } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin', 'retail'])) {
    return null
  }
  return session
}

function canEditAllPageCopy(staff: StaffProfile | null) {
  return requireStaffRole(staff, ['marketing', 'secretary', 'admin'])
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

export async function GET(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const staff = session.staff
    const allPages = canEditAllPageCopy(staff)
    const client = getWixClient()
    const result = await client.items.query('PageContent').ascending('page').limit(100).find()
    let pages = (result.items ?? []).map((i) => mapRow(i as Record<string, unknown>))
    const known = new Set(pages.map((p) => p.page))
    const defaultKeys = allPages
      ? Object.keys(PAGE_CONTENT_DEFAULTS)
      : [...COVE_PAGE_CONTENT_KEYS]
    const missing = defaultKeys
      .filter((page) => !known.has(page))
      .map((page) => {
        const d = PAGE_CONTENT_DEFAULTS[page]
        return {
          id: '',
          page,
          eyebrow: d?.eyebrow ?? '',
          title: d?.title ?? '',
          body: d?.body ?? '',
          sectionTitle: d?.sectionTitle ?? '',
          sectionBody: d?.sectionBody ?? '',
          bullets: (d?.bullets ?? []).join('\n'),
          ctaLabel: d?.ctaLabel ?? '',
          ctaHref: d?.ctaHref ?? '',
          flyerImage: d?.flyerImage ?? '',
          active: true,
          fromDefault: true,
        }
      })
    let merged = [...pages, ...missing]
    if (!allPages) {
      merged = merged.filter((p) => isCovePageContentKey(p.page))
    }
    if (isDemoInstance()) {
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
