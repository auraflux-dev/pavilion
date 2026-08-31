import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import type { InlineEditTarget, PageContentField } from '@/lib/cms/inline-edit-target'
import { parseStringOverrides } from '@/lib/copy/string-overrides'
import { revalidatePublicPage } from '@/lib/staff/revalidate-public'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, 'admin')) {
    return null
  }
  return session
}

const PAGE_FIELDS = new Set<PageContentField>([
  'eyebrow',
  'title',
  'body',
  'sectionTitle',
  'sectionBody',
  'ctaLabel',
  'ctaHref',
  'bullets',
])

type PageContentRow = {
  page: string
  eyebrow: string
  title: string
  body: string
  sectionTitle: string
  sectionBody: string
  bullets: string
  ctaLabel: string
  ctaHref: string
  flyerImage: string
  customCss: string
  stringOverrides: string
  active: boolean
}

function emptyRow(page: string): PageContentRow {
  return {
    page,
    eyebrow: '',
    title: '',
    body: '',
    sectionTitle: '',
    sectionBody: '',
    bullets: '',
    ctaLabel: '',
    ctaHref: '',
    flyerImage: '',
    customCss: '',
    stringOverrides: '',
    active: true,
  }
}

function serializeOverrides(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, v]) => String(v).trim())
    .map(([k, v]) => `${k}|${v}`)
    .join('\n')
}

async function loadPavilionRow(orgId: string, page: string): Promise<PageContentRow> {
  const { getCmsPageContent } = await import('@/lib/cms/store')
  const existing = await getCmsPageContent(orgId, page)
  if (!existing) return emptyRow(page)
  return {
    page: existing.page,
    eyebrow: existing.eyebrow ?? '',
    title: existing.title ?? '',
    body: existing.body ?? '',
    sectionTitle: existing.sectionTitle ?? '',
    sectionBody: existing.sectionBody ?? '',
    bullets: Array.isArray(existing.bullets) ? existing.bullets.join('\n') : '',
    ctaLabel: existing.ctaLabel ?? '',
    ctaHref: existing.ctaHref ?? '',
    flyerImage: existing.flyerImage ?? '',
    customCss: existing.customCss ?? '',
    stringOverrides: existing.stringOverrides ?? '',
    active: true,
  }
}

async function loadWixRow(page: string): Promise<Record<string, unknown>> {
  const client = getWixClient()
  const found = await client.items.query('PageContent').eq('page', page).limit(1).find()
  const existing = found.items?.[0] as Record<string, unknown> | undefined
  if (existing?._id) return existing
  const inserted = await client.items.insert('PageContent', {
    page,
    active: true,
    eyebrow: '',
    title: '',
    body: '',
    sectionTitle: '',
    sectionBody: '',
    bullets: '',
    ctaLabel: '',
    ctaHref: '',
    flyerImage: '',
    customCss: '',
    stringOverrides: '',
  })
  return inserted as Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const body = await req.json()
    const target = body.target as InlineEditTarget
    const value = String(body.value ?? '').trim()
    if (!target?.type) {
      return NextResponse.json({ error: 'target is required' }, { status: 400 })
    }

    const page = String(target.page ?? '').trim()
    if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 })

    const { pavilionCmsEnabled, resolveCmsOrganizationId, upsertCmsPageContent } =
      await import('@/lib/cms/store')

    if (pavilionCmsEnabled()) {
      const orgId = await resolveCmsOrganizationId(req)
      if (!orgId) {
        return NextResponse.json({ error: 'Organization required for Pavilion CMS' }, { status: 400 })
      }
      const row = await loadPavilionRow(orgId, page)

      if (target.type === 'pageField') {
        const field = target.field
        if (!PAGE_FIELDS.has(field)) {
          return NextResponse.json({ error: 'Invalid page field' }, { status: 400 })
        }
        await upsertCmsPageContent(orgId, { ...row, [field]: value })
        revalidatePublicPage(page)
        return NextResponse.json({ ok: true, id: page })
      }

      if (target.type === 'stringOverride') {
        const key = String(target.key ?? '').trim()
        if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
        const current = parseStringOverrides(row.stringOverrides)
        current[key] = value
        await upsertCmsPageContent(orgId, {
          ...row,
          stringOverrides: serializeOverrides(current),
        })
        revalidatePublicPage(page)
        return NextResponse.json({ ok: true, id: page })
      }

      return NextResponse.json({ error: 'Unknown target type' }, { status: 400 })
    }

    const row = await loadWixRow(page)
    const id = String(row._id ?? '')
    const client = getWixClient()

    if (target.type === 'pageField') {
      const field = target.field
      if (!PAGE_FIELDS.has(field)) {
        return NextResponse.json({ error: 'Invalid page field' }, { status: 400 })
      }
      await client.items.update('PageContent', {
        ...row,
        _id: id,
        [field]: value,
      } as Parameters<typeof client.items.update>[1])
      revalidatePublicPage(page)
      return NextResponse.json({ ok: true, id })
    }

    if (target.type === 'stringOverride') {
      const key = String(target.key ?? '').trim()
      if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
      const current = parseStringOverrides(String(row.stringOverrides ?? ''))
      current[key] = value
      await client.items.update('PageContent', {
        ...row,
        _id: id,
        stringOverrides: serializeOverrides(current),
      } as Parameters<typeof client.items.update>[1])
      revalidatePublicPage(page)
      return NextResponse.json({ ok: true, id })
    }

    return NextResponse.json({ error: 'Unknown target type' }, { status: 400 })
  } catch (err) {
    console.error('/api/staff/inline-copy POST', err)
    return NextResponse.json({ error: 'Could not save copy' }, { status: 500 })
  }
}
