/**
 * Scoop share helpers: school Scoop is the school channel; PTO supplies a newsletter web link
 * (from Publish to site). Staff can also WhatsApp / portal-post that same link to free parents.
 */
import { newsletterSiteOrigin } from './newsletter-site'

export const SCOOP_DEFAULT_SUBJECT = 'SHMS Weekly Scoop'

export function defaultScoopPageUrl(): string {
  return `${newsletterSiteOrigin()}/newsletter`
}

export function resolveScoopUrl(raw: string, canvaViewUrl?: string): string {
  return String(raw ?? '').trim() || String(canvaViewUrl ?? '').trim() || defaultScoopPageUrl()
}

export function buildScoopShareText(opts: {
  subject: string
  body: string
  url: string
}): string {
  const subject = String(opts.subject ?? '').trim() || SCOOP_DEFAULT_SUBJECT
  const body = String(opts.body ?? '').trim()
  const url = String(opts.url ?? '').trim()
  const parts: string[] = [subject]
  if (body) parts.push(body)
  if (url && !body.includes(url) && !subject.includes(url)) parts.push(url)
  return parts.join('\n\n')
}
