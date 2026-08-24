/**
 * Staff editors show effective live copy: CMS value when set, else code defaults.
 * Mirrors public merge in getPageContent / getPageStrings without demo transforms.
 */
import { PAGE_CONTENT_DEFAULTS, type PageContentFields } from '@/lib/defaults/page-content'
import {
  formatStringOverrides,
  mergeStringOverrides,
  parseStringOverrides,
} from '@/lib/copy/string-overrides'
import { PORTAL_COPY_DEFAULTS, portalHubBulletsDefault, parseKeyedLines } from '@/lib/defaults/portal-copy'
import { SITE_STRING_DEFAULTS } from '@/lib/defaults/site-string-defaults'

export type StaffPageContentRow = {
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
  fromDefault?: boolean
  usesLiveDefaults?: boolean
}

function trim(value: unknown): string {
  return String(value ?? '').trim()
}

function parseBullets(raw: string): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)
}

function mergeField(cms: string, fallback: string): { value: string; fromDefault: boolean } {
  const value = trim(cms) || fallback
  return { value, fromDefault: !trim(cms) && Boolean(fallback) }
}

/** Hero + section fields merged with PAGE_CONTENT_DEFAULTS (what www shows). */
export function effectivePageContentRow(
  page: string,
  cms: Partial<StaffPageContentRow>,
): StaffPageContentRow {
  const fallback = PAGE_CONTENT_DEFAULTS[page]
  const fbBullets = (fallback?.bullets ?? []).join('\n')

  const eyebrow = mergeField(cms.eyebrow ?? '', fallback?.eyebrow ?? '')
  const title = mergeField(cms.title ?? '', fallback?.title ?? '')
  const body = mergeField(cms.body ?? '', fallback?.body ?? '')
  const sectionTitle = mergeField(cms.sectionTitle ?? '', fallback?.sectionTitle ?? '')
  const sectionBody = mergeField(cms.sectionBody ?? '', fallback?.sectionBody ?? '')
  const bullets = mergeField(cms.bullets ?? '', fbBullets)
  const ctaLabel = mergeField(cms.ctaLabel ?? '', fallback?.ctaLabel ?? '')
  const ctaHref = mergeField(cms.ctaHref ?? '', fallback?.ctaHref ?? '')
  const flyerImage = mergeField(cms.flyerImage ?? '', fallback?.flyerImage ?? '')

  const usesLiveDefaults =
    eyebrow.fromDefault ||
    title.fromDefault ||
    body.fromDefault ||
    sectionTitle.fromDefault ||
    sectionBody.fromDefault ||
    bullets.fromDefault ||
    ctaLabel.fromDefault ||
    ctaHref.fromDefault

  return {
    id: cms.id ?? '',
    page,
    eyebrow: eyebrow.value,
    title: title.value,
    body: body.value,
    sectionTitle: sectionTitle.value,
    sectionBody: sectionBody.value,
    bullets: bullets.value,
    ctaLabel: ctaLabel.value,
    ctaHref: ctaHref.value,
    flyerImage: flyerImage.value,
    active: cms.active !== false,
    fromDefault: !cms.id,
    usesLiveDefaults,
  }
}

/** Portal row keys mapped for Page CSS & strings editor. */
function portalAccountStringDefaults(): Record<string, string> {
  const portal = PAGE_CONTENT_DEFAULTS.portal
  return {
    paidTitle: portal?.sectionTitle ?? PORTAL_COPY_DEFAULTS.paidTitle,
    paidBody: portal?.sectionBody ?? PORTAL_COPY_DEFAULTS.paidBody,
    freeTitle: portal?.title ?? PORTAL_COPY_DEFAULTS.freeTitle,
    freeBody: portal?.body ?? PORTAL_COPY_DEFAULTS.freeBody,
    emptyTitle: portal?.bullets?.[0] ?? PORTAL_COPY_DEFAULTS.emptyTitle,
    emptyBody: portal?.bullets?.[1] ?? PORTAL_COPY_DEFAULTS.emptyBody,
    upgradeBody: portal?.bullets?.[2] ?? PORTAL_COPY_DEFAULTS.upgradeBody,
  }
}

function portalAccountStringsFromCms(content: PageContentFields): Record<string, string> {
  return {
    paidTitle: trim(content.sectionTitle),
    paidBody: trim(content.sectionBody),
    freeTitle: trim(content.title),
    freeBody: trim(content.body),
    emptyTitle: trim(content.bullets[0] ?? ''),
    emptyBody: trim(content.bullets[1] ?? ''),
    upgradeBody: trim(content.bullets[2] ?? ''),
  }
}

function hubBulletDefaults(): Record<string, string> {
  return parseKeyedLines(parseBullets(portalHubBulletsDefault()))
}

/**
 * Effective key|text lines for Page CSS & strings (what the live site uses).
 */
export function effectiveStringOverridesDisplay(
  page: string,
  content: PageContentFields,
): string {
  const codeDefaults = SITE_STRING_DEFAULTS[page] ?? {}
  const cmsOverrides = parseStringOverrides(content.stringOverrides)
  const cmsBullets = parseKeyedLines(content.bullets)

  if (page === 'portal') {
    const merged = mergeStringOverrides(
      mergeStringOverrides(portalAccountStringDefaults(), portalAccountStringsFromCms(content)),
      cmsOverrides,
    )
    return formatStringOverrides(merged)
  }

  if (page === 'portal-hub') {
    const merged = mergeStringOverrides(
      mergeStringOverrides(hubBulletDefaults(), cmsBullets),
      cmsOverrides,
    )
    return formatStringOverrides(merged)
  }

  const merged = mergeStringOverrides(
    mergeStringOverrides(codeDefaults, cmsBullets),
    cmsOverrides,
  )
  return formatStringOverrides(merged)
}

/** Raw CMS row fields for PATCH (strip display-only defaults when saving unchanged). */
export function pageContentFieldsFromStaffRow(row: StaffPageContentRow): PageContentFields {
  return {
    page: row.page,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    sectionTitle: row.sectionTitle,
    sectionBody: row.sectionBody,
    bullets: parseBullets(row.bullets),
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    flyerImage: row.flyerImage,
    customCss: '',
    stringOverrides: '',
  }
}
