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
