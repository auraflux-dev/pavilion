import type { SurveyBranding, SurveyDefinition, SurveyField } from './types'

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSurveyItem(item: any): SurveyDefinition | null {
  const data = item?.data ?? item
  const slug = String(data.slug ?? '').trim()
  if (!slug) return null

  return {
    id: String(item._id ?? item.id ?? ''),
    slug,
    title: String(data.title ?? 'Survey'),
    description: String(data.description ?? ''),
    intro: String(data.intro ?? data.description ?? ''),
    fields: safeJson<SurveyField[]>(data.fieldsJson, []),
    branding: safeJson<SurveyBranding>(data.brandingJson, {
      accentColor: '#085508',
 thankYouMessage: 'Thank you. your response was recorded.',
    }),
    audience: data.audience === 'members' ? 'members' : 'all',
    showInPortal: data.showInPortal !== false,
    requireLogin: data.requireLogin === true || data.audience === 'members',
    createdBy: String(data.createdBy ?? ''),
    powrEmbedHtml: String(data.powrEmbedHtml ?? '').trim() || undefined,
  }
}

export function surveyShareUrl(slug: string, channel?: string): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.shmspto.org').replace(/\/$/, '')
  const url = `${base}/survey/${slug}`
  return channel ? `${url}?from=${channel}` : url
}
