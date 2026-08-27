import 'server-only'

/**
 * Page heroes / marketing copy from Wix CMS PageContent collection.
 * Falls back to code defaults when the collection or row is missing.
 *
 * Collection fields: page, eyebrow, title, body, sectionTitle, sectionBody,
 * bullets (newline-separated), ctaLabel, ctaHref, active
 */
import {
  PAGE_CONTENT_DEFAULTS,
  type PageContentFields,
} from '@/lib/defaults/page-content'
import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { brandifyCoveDigitalCard } from '@/lib/copy/brandify-cove-digital-card'
import { brandifyShmsPto } from '@/lib/copy/brandify-shms-pto'
import { humanizePublicCopy } from '@/lib/copy/humanize-public-copy'
import { rollForwardSchoolYearCopy } from '@/lib/copy/roll-forward-school-year'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

interface WixDataItem {
  id?: string
  data?: {
    page?: string
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
  }
}

function parseBullets(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)
}

function merge(
  page: string,
  cms: Partial<PageContentFields> | null
): PageContentFields {
  const fallback = PAGE_CONTENT_DEFAULTS[page] ?? {
    page,
    eyebrow: '',
    title: '',
    body: '',
    sectionTitle: '',
    sectionBody: '',
    bullets: [],
    ctaLabel: '',
    ctaHref: '',
    flyerImage: '',
    customCss: '',
    stringOverrides: '',
  }
  const merged = !cms
    ? { ...fallback }
    : {
        page,
        eyebrow: cms.eyebrow || fallback.eyebrow,
        title: cms.title || fallback.title,
        body: cms.body || fallback.body,
        sectionTitle: cms.sectionTitle || fallback.sectionTitle,
        sectionBody: cms.sectionBody || fallback.sectionBody,
        bullets: cms.bullets?.length ? cms.bullets : fallback.bullets,
        ctaLabel: cms.ctaLabel || fallback.ctaLabel,
        ctaHref: cms.ctaHref || fallback.ctaHref,
        flyerImage: cms.flyerImage || fallback.flyerImage || '',
        customCss: cms.customCss ?? fallback.customCss ?? '',
        stringOverrides: cms.stringOverrides ?? fallback.stringOverrides ?? '',
      }

  const pub = (text: string) =>
    vanillaizeIfDemo(humanizePublicCopy(brandifyCoveDigitalCard(brandifyShmsPto(text))))

  return {
    ...merged,
    eyebrow: vanillaizeIfDemo(
      rollForwardSchoolYearCopy(brandifyCoveDigitalCard(brandifyShmsPto(merged.eyebrow))),
    ),
    title: pub(merged.title),
    body: pub(merged.body),
    sectionTitle: pub(merged.sectionTitle),
    sectionBody: pub(merged.sectionBody),
    bullets: merged.bullets.map((b) => pub(b)),
    ctaLabel: vanillaizeIfDemo(
      rollForwardSchoolYearCopy(brandifyCoveDigitalCard(brandifyShmsPto(merged.ctaLabel))),
    ),
  }
}

async function fetchPageRow(page: string): Promise<Partial<PageContentFields> | null> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return null

  try {
    const res = await fetchWithRetry('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'PageContent',
        query: {
          filter: {
            page: { $eq: page },
            active: { $eq: true },
          },
          paging: { limit: 1 },
        },
      }),
      cache: 'no-store',
    })

    if (!res.ok) return null
    const data = await res.json()
    const item = (data.dataItems ?? [])[0] as WixDataItem | undefined
    if (!item?.data) return null

    return {
      page,
      eyebrow: item.data.eyebrow ?? '',
      title: item.data.title ?? '',
      body: item.data.body ?? '',
      sectionTitle: item.data.sectionTitle ?? '',
      sectionBody: item.data.sectionBody ?? '',
      bullets: parseBullets(item.data.bullets),
      ctaLabel: item.data.ctaLabel ?? '',
      ctaHref: item.data.ctaHref ?? '',
      flyerImage: item.data.flyerImage ?? '',
      customCss: item.data.customCss ?? '',
      stringOverrides: item.data.stringOverrides ?? '',
    }
  } catch {
    return null
  }
}

export async function getPageContent(page: string): Promise<PageContentFields> {
  // Env brand pack only — do not import active-trial-server here (pulled into client graphs
  // via page-strings helpers). Cookie/session packs resolve in layout + server routes.
  const { getActiveTrialPack } = await import('@/lib/crm/active-trial')
  const brandPack = getActiveTrialPack()
  if (brandPack?.pages?.[page]) return merge(page, brandPack.pages[page])

  // Pavilion CMS (Postgres) when commons DB is on — authoritative for demo/platform.
  try {
    const { pavilionCmsEnabled, resolveCmsOrganizationId, getCmsPageContent } =
      await import('@/lib/cms/store')
    if (pavilionCmsEnabled()) {
      const orgId = await resolveCmsOrganizationId()
      if (orgId) {
        const row = await getCmsPageContent(orgId, page)
        if (row) return merge(page, row)
      }
    }
  } catch {
    // fall through to demo fixtures / Wix
  }

  if (isDemoInstance()) {
    const { DEMO_PAGES } = await import('@/lib/demo/content')
    const row = DEMO_PAGES[page]
    if (row) return { ...row }
    return merge(page, null)
  }
  const cms = await fetchPageRow(page)
  if (
    cms &&
    isCmsQaItem(
      cms.eyebrow,
      cms.title,
      cms.body,
      cms.sectionTitle,
      cms.sectionBody,
      ...(cms.bullets ?? []),
    )
  ) {
    return merge(page, null)
  }
  return merge(page, cms)
}

export type { PageContentFields }
