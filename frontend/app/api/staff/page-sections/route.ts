/**
 * Staff page sections API (demo/trial page builder only).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'
import {
  COMPOSABLE_PAGES,
  emptySectionData,
  isSectionType,
  parseSectionData,
} from '@/lib/cms/section-types'
import { revalidatePublicPage } from '@/lib/staff/revalidate-public'

async function gate(req: NextRequest) {
  if (!cmsPageBuilderEnabled()) {
    return { error: NextResponse.json({ error: 'Page builder unavailable' }, { status: 404 }) }
  }
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'secretary', 'admin'])) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const pageSlug = String(req.nextUrl.searchParams.get('page') ?? 'home').trim() || 'home'
  const {
    resolveCmsOrganizationId,
    listCmsPageSections,
    countCmsPageSections,
  } = await import('@/lib/cms/store')
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()

  if ((await countCmsPageSections(orgId, pageSlug)) === 0) {
    if (pageSlug === 'home') {
      const { seedHomeSectionsIfEmpty } = await import('@/lib/cms/seed-page-sections')
      await seedHomeSectionsIfEmpty(orgId)
    } else {
      const { seedPageSectionsFromPageContent } = await import('@/lib/cms/seed-page-sections')
      await seedPageSectionsFromPageContent(orgId, pageSlug)
    }
  }

  const sections = await listCmsPageSections(orgId, pageSlug, false)
  const { listCmsCustomPages } = await import('@/lib/cms/store')
  const custom = await listCmsCustomPages(orgId, false)
  const pages = [
    ...COMPOSABLE_PAGES.map((p) => ({ slug: p.slug, label: p.label, href: p.href, custom: false })),
    ...custom.map((p) => ({
      slug: p.slug,
      label: p.title,
      href: `/p/${p.slug}`,
      custom: true,
    })),
  ]
  return NextResponse.json({
    pages,
    pageSlug,
    sections: sections.map((s) => ({
      ...s,
      data: isSectionType(s.sectionType)
        ? parseSectionData(s.sectionType, s.data)
        : s.data,
    })),
  })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? 'upsert')
  const {
    resolveCmsOrganizationId,
    upsertCmsPageSection,
    reorderCmsPageSections,
    deleteCmsPageSection,
  } = await import('@/lib/cms/store')
  const orgId = await resolveCmsOrganizationId(req)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()

  if (action === 'reorder') {
    const pageSlug = String(body.pageSlug ?? '').trim()
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id: unknown) => String(id))
      : []
    if (!pageSlug || !orderedIds.length) {
      return NextResponse.json({ error: 'pageSlug and orderedIds required' }, { status: 400 })
    }
    await reorderCmsPageSections(orgId, pageSlug, orderedIds)
    revalidatePublicPage(pageSlug)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteCmsPageSection(orgId, id)
    const pageSlug = String(body.pageSlug ?? '').trim()
    if (pageSlug) revalidatePublicPage(pageSlug)
    return NextResponse.json({ ok: true })
  }

  if (action === 'create-page') {
    const rawSlug = String(body.slug ?? '').trim().toLowerCase()
    const slug = rawSlug.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    const title = String(body.title ?? '').trim() || slug
    const reserved = new Set([
      'staff',
      'member-portal',
      'api',
      'auth',
      'cart',
      'checkout',
      'login',
      'join',
      'review',
      'trial',
      'p',
      'programs',
      'events',
      'signups',
      'survey',
      'legal',
      'newsletter',
      'home',
      'membership',
      'volunteer',
      'board',
      'contact',
      'fundraising',
      'cove',
      'meetings',
      'privacy',
      'terms',
      'photo-release',
      'data-security',
    ])
    if (!slug || reserved.has(slug) || COMPOSABLE_PAGES.some((p) => p.slug === slug)) {
      return NextResponse.json({ error: 'Invalid or reserved slug' }, { status: 400 })
    }
    const { upsertCmsCustomPage, upsertCmsNavLink, upsertCmsPageSection } = await import(
      '@/lib/cms/store'
    )
    const page = await upsertCmsCustomPage(orgId, {
      slug,
      title,
      showInNav: body.showInNav !== false,
      active: true,
    })
    await upsertCmsPageSection(orgId, {
      pageSlug: slug,
      sortOrder: 0,
      sectionType: 'hero',
      data: emptySectionData('hero') as unknown as Record<string, unknown>,
      active: true,
    })
    // Seed hero title from page title
    const sections = await (await import('@/lib/cms/store')).listCmsPageSections(orgId, slug, false)
    const hero = sections[0]
    if (hero) {
      await upsertCmsPageSection(orgId, {
        id: hero.id,
        pageSlug: slug,
        sortOrder: 0,
        sectionType: 'hero',
        data: {
          ...emptySectionData('hero'),
          title,
          body: 'Add your content with Edit page layout.',
          ctaLabel: '',
          ctaHref: '',
        } as unknown as Record<string, unknown>,
        active: true,
      })
    }
    if (page.showInNav) {
      await upsertCmsNavLink(orgId, {
        label: title,
        href: `/p/${slug}`,
        sortOrder: page.sortOrder,
        showInNav: true,
        showInFooter: false,
        active: true,
      })
    }
    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/p/${slug}`)
    revalidatePath('/', 'layout')
    return NextResponse.json({ page, href: `/p/${slug}` })
  }

  if (action === 'add') {
    const pageSlug = String(body.pageSlug ?? '').trim()
    const sectionType = String(body.sectionType ?? '').trim()
    if (!pageSlug || !isSectionType(sectionType)) {
      return NextResponse.json({ error: 'pageSlug and valid sectionType required' }, { status: 400 })
    }
    const sortOrder = Number(body.sortOrder ?? 999) || 999
    const row = await upsertCmsPageSection(orgId, {
      pageSlug,
      sortOrder,
      sectionType,
      data: emptySectionData(sectionType) as unknown as Record<string, unknown>,
      active: true,
    })
    revalidatePublicPage(pageSlug)
    return NextResponse.json({ section: row })
  }

  // upsert
  const pageSlug = String(body.pageSlug ?? '').trim()
  const sectionType = String(body.sectionType ?? '').trim()
  if (!pageSlug || !isSectionType(sectionType)) {
    return NextResponse.json({ error: 'pageSlug and valid sectionType required' }, { status: 400 })
  }
  const data = parseSectionData(sectionType, body.data ?? {})
  const row = await upsertCmsPageSection(orgId, {
    id: body.id ? String(body.id) : undefined,
    pageSlug,
    sortOrder: Number(body.sortOrder ?? 0) || 0,
    sectionType,
    data: data as unknown as Record<string, unknown>,
    active: body.active !== false,
  })
  revalidatePublicPage(pageSlug)
  return NextResponse.json({ section: row })
}
