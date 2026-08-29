import 'server-only'

/**
 * Pavilion CMS repository (Postgres). Authoritative content for demo/platform orgs.
 * SHMS publish path: sync selected org rows → Wix (see docs/PAVILION-CMS.md).
 */
import { randomUUID } from 'crypto'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { riversideSnapshot } from '@/lib/crm/riverside'
import {
  MissingOrganizationIdError,
  organizationIdFromRequest,
  requireOrganizationId,
  sqlForOrg,
} from '@/lib/crm/tenant'
import { isDemoInstance } from '@/lib/demo/instance'
import type { PageContentFields } from '@/lib/defaults/page-content'
import type { NavLink } from '@/lib/api/nav'

export function pavilionCmsEnabled(): boolean {
  return commonsDbEnabled()
}

/** Resolve org for public/server CMS reads (demo → Riverside; platform → host/session). */
export async function resolveCmsOrganizationId(req?: Request): Promise<string | null> {
  if (!pavilionCmsEnabled()) return null
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()

  // Platform owners may pin a customer org via cookie (Staff CMS switcher).
  if (req) {
    try {
      const { PLATFORM_CMS_ORG_COOKIE, isPlatformOwnerEmail, readPlatformCmsOrgCookie } =
        await import('@/lib/crm/platform-owners')
      const cookieOrg = readPlatformCmsOrgCookie(req.headers.get('cookie'))
      if (cookieOrg) {
        const { getAuth } = await import('@/lib/crm/auth')
        const auth = getAuth()
        const session = auth
          ? await auth.api.getSession({ headers: req.headers })
          : null
        const email = String(session?.user?.email ?? '').trim().toLowerCase()
        if (email && (await isPlatformOwnerEmail(email))) {
          return requireOrganizationId(cookieOrg)
        }
        // Demo staff tour: allow cookie org when demo instance
        const { isDemoInstance } = await import('@/lib/demo/instance')
        if (isDemoInstance()) return requireOrganizationId(cookieOrg)
      }
      void PLATFORM_CMS_ORG_COOKIE
    } catch {
      // fall through
    }
  }

  if (req) {
    try {
      return await organizationIdFromRequest(req)
    } catch (err) {
      if (!(err instanceof MissingOrganizationIdError)) throw err
    }
  }
  if (isDemoInstance()) return requireOrganizationId(riversideSnapshot().organization.id)
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const synthetic = new Request('https://pavilion.local', { headers: h })
    return await organizationIdFromRequest(synthetic)
  } catch {
    if (isDemoInstance()) return requireOrganizationId(riversideSnapshot().organization.id)
    return null
  }
}

export async function listCmsSiteSettings(orgId: string): Promise<Record<string, string>> {
  const res = await sqlForOrg<{ key: string; value: string }>(
    orgId,
    `select key, value from cms_site_settings where organization_id = $1`,
    [orgId],
  )
  const map: Record<string, string> = {}
  for (const row of res.rows) map[row.key] = row.value ?? ''
  return map
}

export async function upsertCmsSiteSetting(
  orgId: string,
  key: string,
  value: string,
): Promise<void> {
  await sqlForOrg(
    orgId,
    `insert into cms_site_settings (organization_id, key, value, updated_at)
     values ($1, $2, $3, now())
     on conflict (organization_id, key) do update set
       value = excluded.value,
       updated_at = now()`,
    [orgId, key, value],
  )
}

export type CmsPageRow = PageContentFields & { active: boolean }

export async function getCmsPageContent(
  orgId: string,
  page: string,
): Promise<CmsPageRow | null> {
  const res = await sqlForOrg<{
    page: string
    eyebrow: string
    title: string
    body: string
    section_title: string
    section_body: string
    bullets: string
    cta_label: string
    cta_href: string
    flyer_image: string
    custom_css: string
    string_overrides: string
    active: boolean | null
  }>(
    orgId,
    `select page, eyebrow, title, body, section_title, section_body, bullets,
            cta_label, cta_href, flyer_image, custom_css, string_overrides, active
       from cms_page_content
      where organization_id = $1 and page = $2
      limit 1`,
    [orgId, page],
  )
  const row = res.rows[0]
  if (!row) return null
  const active = row.active !== false && row.active !== null
  if (!active) return null
  return {
    page: row.page,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    sectionTitle: row.section_title,
    sectionBody: row.section_body,
    bullets: row.bullets
      ? row.bullets.split('\n').map((b) => b.trim()).filter(Boolean)
      : [],
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    flyerImage: row.flyer_image,
    customCss: row.custom_css,
    stringOverrides: row.string_overrides,
    active: true,
  }
}

export async function listCmsPageContent(orgId: string): Promise<
  Array<{
    id: string
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
    active: boolean
  }>
> {
  const res = await sqlForOrg<{
    page: string
    eyebrow: string
    title: string
    body: string
    section_title: string
    section_body: string
    bullets: string
    cta_label: string
    cta_href: string
    flyer_image: string
    active: boolean
  }>(
    orgId,
    `select page, eyebrow, title, body, section_title, section_body, bullets,
            cta_label, cta_href, flyer_image, active
       from cms_page_content
      where organization_id = $1
      order by page`,
    [orgId],
  )
  return res.rows.map((row) => ({
    id: row.page,
    page: row.page,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    sectionTitle: row.section_title,
    sectionBody: row.section_body,
    bullets: row.bullets,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    flyerImage: row.flyer_image,
    active: row.active !== false,
  }))
}

export async function upsertCmsPageContent(
  orgId: string,
  input: {
    page: string
    eyebrow?: string
    title?: string
    body?: string
    sectionTitle?: string
    sectionBody?: string
    bullets?: string
    ctaLabel?: string
    ctaHref?: string
    flyerImage?: string
    customCss?: string
    stringOverrides?: string
    active?: boolean
  },
): Promise<void> {
  const page = String(input.page ?? '').trim()
  if (!page) throw new Error('page required')
  await sqlForOrg(
    orgId,
    `insert into cms_page_content (
       organization_id, page, eyebrow, title, body, section_title, section_body,
       bullets, cta_label, cta_href, flyer_image, custom_css, string_overrides, active, updated_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now()
     )
     on conflict (organization_id, page) do update set
       eyebrow = excluded.eyebrow,
       title = excluded.title,
       body = excluded.body,
       section_title = excluded.section_title,
       section_body = excluded.section_body,
       bullets = excluded.bullets,
       cta_label = excluded.cta_label,
       cta_href = excluded.cta_href,
       flyer_image = excluded.flyer_image,
       custom_css = excluded.custom_css,
       string_overrides = excluded.string_overrides,
       active = excluded.active,
       updated_at = now()`,
    [
      orgId,
      page,
      String(input.eyebrow ?? ''),
      String(input.title ?? ''),
      String(input.body ?? ''),
      String(input.sectionTitle ?? ''),
      String(input.sectionBody ?? ''),
      String(input.bullets ?? ''),
      String(input.ctaLabel ?? ''),
      String(input.ctaHref ?? ''),
      String(input.flyerImage ?? ''),
      String(input.customCss ?? ''),
      String(input.stringOverrides ?? ''),
      input.active !== false,
    ],
  )
}

export async function listCmsNavLinks(orgId: string, activeOnly = true): Promise<NavLink[]> {
  const res = await sqlForOrg<{
    id: string
    label: string
    href: string
    sort_order: number
    show_in_nav: boolean
    show_in_footer: boolean
    active: boolean
  }>(
    orgId,
    activeOnly
      ? `select id, label, href, sort_order, show_in_nav, show_in_footer, active
           from cms_nav_links
          where organization_id = $1 and active = true
          order by sort_order asc`
      : `select id, label, href, sort_order, show_in_nav, show_in_footer, active
           from cms_nav_links
          where organization_id = $1
          order by sort_order asc`,
    [orgId],
  )
  return res.rows.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href,
    sortOrder: row.sort_order,
    showInNav: row.show_in_nav,
    showInFooter: row.show_in_footer,
    active: row.active,
  }))
}

export async function upsertCmsNavLink(
  orgId: string,
  link: Partial<NavLink> & { label: string; href: string },
): Promise<NavLink> {
  const id = String(link.id ?? '').trim() || randomUUID()
  await sqlForOrg(
    orgId,
    `insert into cms_nav_links (
       id, organization_id, label, href, sort_order, show_in_nav, show_in_footer, active, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (id) do update set
       label = excluded.label,
       href = excluded.href,
       sort_order = excluded.sort_order,
       show_in_nav = excluded.show_in_nav,
       show_in_footer = excluded.show_in_footer,
       active = excluded.active,
       updated_at = now()`,
    [
      id,
      orgId,
      link.label.trim(),
      link.href.trim(),
      Number(link.sortOrder ?? 99) || 99,
      link.showInNav !== false,
      link.showInFooter === true,
      link.active !== false,
    ],
  )
  return {
    id,
    label: link.label.trim(),
    href: link.href.trim(),
    sortOrder: Number(link.sortOrder ?? 99) || 99,
    showInNav: link.showInNav !== false,
    showInFooter: link.showInFooter === true,
    active: link.active !== false,
  }
}

export async function deleteCmsNavLink(orgId: string, id: string): Promise<void> {
  await sqlForOrg(
    orgId,
    `delete from cms_nav_links where organization_id = $1 and id = $2`,
    [orgId, id],
  )
}

/** Seed Riverside demo CMS once from DEMO_* fixtures. */
export async function seedDemoCmsIfEmpty(orgId: string): Promise<void> {
  if (!pavilionCmsEnabled()) return
  const count = await sql<{ n: string }>(
    `select count(*)::text as n from cms_site_settings where organization_id = $1`,
    [orgId],
  )
  if (Number(count.rows[0]?.n ?? 0) > 0) return

  const { DEMO_SETTINGS, DEMO_PAGES, DEMO_NAV } = await import('@/lib/demo/content')

  for (const [key, value] of Object.entries(DEMO_SETTINGS)) {
    await upsertCmsSiteSetting(orgId, key, value)
  }
  for (const [page, fields] of Object.entries(DEMO_PAGES)) {
    await upsertCmsPageContent(orgId, {
      page,
      eyebrow: fields.eyebrow,
      title: fields.title,
      body: fields.body,
      sectionTitle: fields.sectionTitle,
      sectionBody: fields.sectionBody,
      bullets: (fields.bullets ?? []).join('\n'),
      ctaLabel: fields.ctaLabel,
      ctaHref: fields.ctaHref,
      flyerImage: fields.flyerImage ?? '',
      customCss: fields.customCss ?? '',
      stringOverrides: fields.stringOverrides ?? '',
      active: true,
    })
  }
  for (const link of DEMO_NAV) {
    await upsertCmsNavLink(orgId, {
      id: link.id.startsWith('f') ? `nav_${link.id}` : link.id,
      label: link.label,
      href: link.href,
      sortOrder: link.sortOrder,
      showInNav: link.showInNav,
      showInFooter: link.showInFooter,
      active: link.active,
    })
  }
}

export type CmsPageSectionRow = {
  id: string
  pageSlug: string
  sortOrder: number
  sectionType: string
  data: Record<string, unknown>
  active: boolean
}

function parseSectionJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function listCmsPageSections(
  orgId: string,
  pageSlug: string,
  activeOnly = true,
): Promise<CmsPageSectionRow[]> {
  const res = await sqlForOrg<{
    id: string
    page_slug: string
    sort_order: number
    section_type: string
    data_json: string
    active: boolean
  }>(
    orgId,
    activeOnly
      ? `select id, page_slug, sort_order, section_type, data_json, active
           from cms_page_sections
          where organization_id = $1 and page_slug = $2 and active = true
          order by sort_order asc`
      : `select id, page_slug, sort_order, section_type, data_json, active
           from cms_page_sections
          where organization_id = $1 and page_slug = $2
          order by sort_order asc`,
    [orgId, pageSlug],
  )
  return res.rows.map((row) => ({
    id: row.id,
    pageSlug: row.page_slug,
    sortOrder: row.sort_order,
    sectionType: row.section_type,
    data: parseSectionJson(row.data_json),
    active: row.active,
  }))
}

export async function countCmsPageSections(orgId: string, pageSlug: string): Promise<number> {
  const res = await sqlForOrg<{ n: string }>(
    orgId,
    `select count(*)::text as n from cms_page_sections
      where organization_id = $1 and page_slug = $2`,
    [orgId, pageSlug],
  )
  return Number(res.rows[0]?.n ?? 0)
}

export async function upsertCmsPageSection(
  orgId: string,
  input: {
    id?: string
    pageSlug: string
    sortOrder?: number
    sectionType: string
    data?: Record<string, unknown>
    active?: boolean
  },
): Promise<CmsPageSectionRow> {
  const id = String(input.id ?? '').trim() || randomUUID()
  const dataJson = JSON.stringify(input.data ?? {})
  const sortOrder = Number(input.sortOrder ?? 0) || 0
  await sqlForOrg(
    orgId,
    `insert into cms_page_sections (
       id, organization_id, page_slug, sort_order, section_type, data_json, active, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (id) do update set
       page_slug = excluded.page_slug,
       sort_order = excluded.sort_order,
       section_type = excluded.section_type,
       data_json = excluded.data_json,
       active = excluded.active,
       updated_at = now()`,
    [
      id,
      orgId,
      input.pageSlug.trim(),
      sortOrder,
      input.sectionType.trim(),
      dataJson,
      input.active !== false,
    ],
  )
  return {
    id,
    pageSlug: input.pageSlug.trim(),
    sortOrder,
    sectionType: input.sectionType.trim(),
    data: input.data ?? {},
    active: input.active !== false,
  }
}

export async function reorderCmsPageSections(
  orgId: string,
  pageSlug: string,
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await sqlForOrg(
      orgId,
      `update cms_page_sections
          set sort_order = $3, updated_at = now()
        where organization_id = $1 and page_slug = $2 and id = $4`,
      [orgId, pageSlug, i, orderedIds[i]],
    )
  }
}

export async function deleteCmsPageSection(orgId: string, id: string): Promise<void> {
  await sqlForOrg(
    orgId,
    `delete from cms_page_sections where organization_id = $1 and id = $2`,
    [orgId, id],
  )
}

export async function deleteCmsPageSectionsForPage(
  orgId: string,
  pageSlug: string,
): Promise<void> {
  await sqlForOrg(
    orgId,
    `delete from cms_page_sections where organization_id = $1 and page_slug = $2`,
    [orgId, pageSlug],
  )
}

export type CmsSiteBrand = {
  logoUrl: string
  faviconUrl: string
  colorPrimary: string
  colorDark: string
  colorAccent: string
  colorWarm: string
  colorSoft: string
  fontSans: string
  fontDisplay: string
  ptoName: string
  schoolName: string
  cheer: string
}

const EMPTY_BRAND: CmsSiteBrand = {
  logoUrl: '',
  faviconUrl: '',
  colorPrimary: '',
  colorDark: '',
  colorAccent: '',
  colorWarm: '',
  colorSoft: '',
  fontSans: '',
  fontDisplay: '',
  ptoName: '',
  schoolName: '',
  cheer: '',
}

export async function getCmsSiteBrand(orgId: string): Promise<CmsSiteBrand | null> {
  const res = await sqlForOrg<{
    logo_url: string
    favicon_url: string
    color_primary: string
    color_dark: string
    color_accent: string
    color_warm: string
    color_soft: string
    font_sans: string
    font_display: string
    pto_name: string
    school_name: string
    cheer: string
  }>(
    orgId,
    `select logo_url, favicon_url, color_primary, color_dark, color_accent, color_warm, color_soft,
            font_sans, font_display, pto_name, school_name, cheer
       from cms_site_brand where organization_id = $1 limit 1`,
    [orgId],
  )
  const row = res.rows[0]
  if (!row) return null
  return {
    logoUrl: row.logo_url ?? '',
    faviconUrl: row.favicon_url ?? '',
    colorPrimary: row.color_primary ?? '',
    colorDark: row.color_dark ?? '',
    colorAccent: row.color_accent ?? '',
    colorWarm: row.color_warm ?? '',
    colorSoft: row.color_soft ?? '',
    fontSans: row.font_sans ?? '',
    fontDisplay: row.font_display ?? '',
    ptoName: row.pto_name ?? '',
    schoolName: row.school_name ?? '',
    cheer: row.cheer ?? '',
  }
}

export async function upsertCmsSiteBrand(
  orgId: string,
  input: Partial<CmsSiteBrand>,
): Promise<CmsSiteBrand> {
  const current = (await getCmsSiteBrand(orgId)) ?? EMPTY_BRAND
  const next: CmsSiteBrand = {
    logoUrl: input.logoUrl ?? current.logoUrl,
    faviconUrl: input.faviconUrl ?? current.faviconUrl,
    colorPrimary: input.colorPrimary ?? current.colorPrimary,
    colorDark: input.colorDark ?? current.colorDark,
    colorAccent: input.colorAccent ?? current.colorAccent,
    colorWarm: input.colorWarm ?? current.colorWarm,
    colorSoft: input.colorSoft ?? current.colorSoft,
    fontSans: input.fontSans ?? current.fontSans,
    fontDisplay: input.fontDisplay ?? current.fontDisplay,
    ptoName: input.ptoName ?? current.ptoName,
    schoolName: input.schoolName ?? current.schoolName,
    cheer: input.cheer ?? current.cheer,
  }
  await sqlForOrg(
    orgId,
    `insert into cms_site_brand (
       organization_id, logo_url, favicon_url, color_primary, color_dark, color_accent,
       color_warm, color_soft, font_sans, font_display, pto_name, school_name, cheer, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
     on conflict (organization_id) do update set
       logo_url = excluded.logo_url,
       favicon_url = excluded.favicon_url,
       color_primary = excluded.color_primary,
       color_dark = excluded.color_dark,
       color_accent = excluded.color_accent,
       color_warm = excluded.color_warm,
       color_soft = excluded.color_soft,
       font_sans = excluded.font_sans,
       font_display = excluded.font_display,
       pto_name = excluded.pto_name,
       school_name = excluded.school_name,
       cheer = excluded.cheer,
       updated_at = now()`,
    [
      orgId,
      next.logoUrl,
      next.faviconUrl,
      next.colorPrimary,
      next.colorDark,
      next.colorAccent,
      next.colorWarm,
      next.colorSoft,
      next.fontSans,
      next.fontDisplay,
      next.ptoName,
      next.schoolName,
      next.cheer,
    ],
  )
  return next
}
