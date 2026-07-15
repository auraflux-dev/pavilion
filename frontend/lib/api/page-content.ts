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
  }
  if (!cms) return { ...fallback }

  return {
    page,
    eyebrow: cms.eyebrow || fallback.eyebrow,
    title: cms.title || fallback.title,
    body: cms.body || fallback.body,
    sectionTitle: cms.sectionTitle || fallback.sectionTitle,
    sectionBody: cms.sectionBody || fallback.sectionBody,
    bullets: cms.bullets?.length ? cms.bullets : fallback.bullets,
    ctaLabel: cms.ctaLabel || fallback.ctaLabel,
    ctaHref: cms.ctaHref || fallback.ctaHref,
  }
}

async function fetchPageRow(page: string): Promise<Partial<PageContentFields> | null> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return null

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
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
      next: { revalidate: 300 },
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
    }
  } catch {
    return null
  }
}

export async function getPageContent(page: string): Promise<PageContentFields> {
  const cms = await fetchPageRow(page)
  return merge(page, cms)
}

export type { PageContentFields }
