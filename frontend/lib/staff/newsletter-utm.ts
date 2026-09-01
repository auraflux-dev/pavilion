/**
 * Append GA-friendly UTM params to http(s) links in plain-text outreach.
 */

export type UtmOpts = {
  campaign: string
  source?: string
  medium?: string
  content?: string
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi
const HTML_HREF_RE = /href\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi

function slugCampaign(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function defaultUtmCampaign(subject: string, explicit?: string): string {
  const fromExplicit = slugCampaign(explicit ?? '')
  if (fromExplicit) return fromExplicit
  const fromSubject = slugCampaign(subject)
  if (fromSubject) return fromSubject
  const d = new Date()
  return `newsletter-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Strip trailing punctuation often glued to URLs in copy. */
function normalizeUrlToken(raw: string): { href: string; suffix: string } {
  let href = raw
  let suffix = ''
  while (/[.,;:!?)}\]]$/.test(href)) {
    suffix = href.slice(-1) + suffix
    href = href.slice(0, -1)
  }
  return { href, suffix }
}

export function tagUrlWithUtm(href: string, opts: UtmOpts): string {
  const campaign = slugCampaign(opts.campaign)
  if (!campaign) return href
  try {
    const u = new URL(href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return href
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', opts.source ?? 'newsletter')
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', opts.medium ?? 'email')
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign)
    if (opts.content && !u.searchParams.has('utm_content')) {
      u.searchParams.set('utm_content', opts.content)
    }
    return u.toString()
  } catch {
    return href
  }
}

/** Replace each URL in text with a UTM-tagged version (preserves trailing punctuation). */
export function tagUrlsInText(text: string, opts: UtmOpts): string {
  if (!text.trim() || !slugCampaign(opts.campaign)) return text
  return text.replace(URL_RE, (match) => {
    const { href, suffix } = normalizeUrlToken(match)
    return `${tagUrlWithUtm(href, opts)}${suffix}`
  })
}

/** Tag http(s) href attributes in HTML email fragments. */
export function tagUrlsInHtml(html: string, opts: UtmOpts): string {
  if (!html.trim() || !slugCampaign(opts.campaign)) return html
  return html.replace(HTML_HREF_RE, (_match, quote: string, href: string) => {
    return `href=${quote}${tagUrlWithUtm(href, opts)}${quote}`
  })
}

export function extractUrlsFromText(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(URL_RE)) {
    const { href } = normalizeUrlToken(match[0])
    if (!seen.has(href)) {
      seen.add(href)
      out.push(href)
    }
  }
  return out
}

export function extractUrlsFromHtml(html: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const match of html.matchAll(HTML_HREF_RE)) {
    const href = String(match[2] ?? '').trim()
    if (href && !seen.has(href)) {
      seen.add(href)
      out.push(href)
    }
  }
  return out
}

/** Unique tracked URLs from plain + HTML (plain order first). */
export function extractTrackedUrls(plain: string, html?: string): string[] {
  const out = extractUrlsFromText(plain)
  const seen = new Set(out)
  if (html?.trim()) {
    for (const href of extractUrlsFromHtml(html)) {
      if (!seen.has(href)) {
        seen.add(href)
        out.push(href)
      }
    }
  }
  return out
}
