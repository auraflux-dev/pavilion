import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { PAGE_CONTENT_DEFAULTS } from '@/lib/defaults/page-content'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin'])) return null
  return session
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
    active: item.active !== false,
  }
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const client = getWixClient()
    const result = await client.items.query('PageContent').ascending('page').limit(100).find()
    const pages = (result.items ?? []).map((i) => mapRow(i as Record<string, unknown>))
    const known = new Set(pages.map((p) => p.page))
    const missing = Object.keys(PAGE_CONTENT_DEFAULTS)
      .filter((page) => !known.has(page))
      .map((page) => {
        const d = PAGE_CONTENT_DEFAULTS[page]
        return {
          id: '',
          page,
          eyebrow: d.eyebrow,
          title: d.title,
          body: d.body,
          sectionTitle: d.sectionTitle,
          sectionBody: d.sectionBody,
          bullets: d.bullets.join('\n'),
          ctaLabel: d.ctaLabel,
          ctaHref: d.ctaHref,
          active: true,
          fromDefault: true,
        }
      })
    return NextResponse.json({ pages: [...pages, ...missing] })
  } catch (err) {
    console.error('/api/staff/page-content GET', err)
    return NextResponse.json({ error: 'Could not load page copy' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const page = String(body.page ?? '').trim()
    if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 })

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
