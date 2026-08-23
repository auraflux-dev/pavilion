/**
 * Saved newsletter CSS templates (built-in presets + local + optional site-wide JSON).
 */

import { NEWSLETTER_DEFAULT_CSS } from '@/lib/staff/newsletter-default-css'

export type NewsletterCssTemplate = {
  id: string
  name: string
  css: string
  updatedAt: string
  source: 'builtin' | 'local' | 'site'
}

export const NEWSLETTER_CSS_TEMPLATES_STORAGE_KEY = 'shmspto.newsletterCssTemplates'

export const BUILTIN_NEWSLETTER_CSS_TEMPLATES: NewsletterCssTemplate[] = [
  {
    id: 'builtin-shms-default',
    name: 'SHMS default',
    css: NEWSLETTER_DEFAULT_CSS,
    updatedAt: '',
    source: 'builtin',
  },
  {
    id: 'builtin-none',
    name: 'No extra CSS',
    css: '',
    updatedAt: '',
    source: 'builtin',
  },
  {
    id: 'builtin-larger-headings',
    name: 'Larger section headings',
    css: `.nl-section-title { font-size: 20px !important; }
.nl-body { font-size: 16px !important; line-height: 1.6 !important; }`,
    updatedAt: '',
    source: 'builtin',
  },
  {
    id: 'builtin-green-links',
    name: 'Green accent links',
    css: `a { color: #1B6B45 !important; text-decoration: underline; }
.nl-section-title { color: #1B6B45 !important; }`,
    updatedAt: '',
    source: 'builtin',
  },
  {
    id: 'builtin-spacious',
    name: 'More spacing between sections',
    css: `.nl-section { padding-top: 32px !important; }
.nl-body p { margin-bottom: 12px; }`,
    updatedAt: '',
    source: 'builtin',
  },
]

export function parseSiteCssTemplatesJson(raw: string): NewsletterCssTemplate[] {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw) as Array<{ name?: string; css?: string; id?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row, i) => ({
        id: String(row.id ?? `site-${i}`),
        name: String(row.name ?? 'Saved template').trim() || 'Saved template',
        css: String(row.css ?? ''),
        updatedAt: '',
        source: 'site' as const,
      }))
      .filter((t) => t.name)
  } catch {
    return []
  }
}

export function serializeSiteCssTemplates(templates: NewsletterCssTemplate[]): string {
  return JSON.stringify(
    templates
      .filter((t) => t.source === 'site' || t.css.trim())
      .map((t) => ({ id: t.id, name: t.name, css: t.css })),
    null,
    2,
  )
}

export function loadLocalCssTemplates(): NewsletterCssTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NEWSLETTER_CSS_TEMPLATES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as NewsletterCssTemplate[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((t) => ({ ...t, source: 'local' as const }))
  } catch {
    return []
  }
}

export function saveLocalCssTemplates(templates: NewsletterCssTemplate[]) {
  if (typeof window === 'undefined') return
  const local = templates.filter((t) => t.source === 'local')
  localStorage.setItem(NEWSLETTER_CSS_TEMPLATES_STORAGE_KEY, JSON.stringify(local))
}

export function mergeCssTemplateLists(
  siteTemplates: NewsletterCssTemplate[],
  localTemplates: NewsletterCssTemplate[],
): NewsletterCssTemplate[] {
  const seen = new Set<string>()
  const out: NewsletterCssTemplate[] = []
  for (const t of [...BUILTIN_NEWSLETTER_CSS_TEMPLATES, ...siteTemplates, ...localTemplates]) {
    const key = `${t.source}:${t.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/** Sample copy for CSS preview (no real parent data). */
export const NEWSLETTER_CSS_PREVIEW_SECTIONS = {
  intro: 'Hello families.\nThis is sample filler text so you can preview fonts, spacing, and CSS before you send.',
  beats: [
    {
      preset: 'event' as const,
      heading: 'Sample event: Open House',
      body: 'Wednesday, September 10 at 6:30 PM.\nVolunteers welcome. Reply if you can help at the welcome table.',
      imageUrl: '',
      imageKey: '',
      imageLinkUrl: '',
    },
    {
      preset: 'cta' as const,
      heading: 'Sample call to action',
      body: 'Sign up on the member portal.\nVisit https://www.shmspto.org/programs for details.',
      imageUrl: '',
      imageKey: '',
      imageLinkUrl: '',
    },
  ],
  signoff: 'Thank you.\nVP Marketing\nStone Hill PTO',
}
