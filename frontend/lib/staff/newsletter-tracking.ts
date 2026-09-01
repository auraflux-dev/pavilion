import {
  extractTrackedUrls,
  tagUrlsInHtml,
  tagUrlsInText,
  type UtmOpts,
} from '@/lib/staff/newsletter-utm'
import { getWixClient } from '@/lib/wix-client'
import { newsletterSiteOrigin } from '@/lib/staff/newsletter-site'

export type TrackedLink = {
  idx: number
  url: string
  clicks: number
}

export type PrepareTrackedSendOpts = {
  body: string
  htmlBody?: string
  utm: UtmOpts
  trackClicks: boolean
  sentByEmail: string
  subject: string
  tier: string
  grade: string
  templateId?: string
  recipientCount: number
}

export type PreparedTrackedSend = {
  sendId: string
  /** Plain text sent to parents (may use /r/ click wrappers). */
  bodyForSend: string
  /** UTM-tagged copy for portal archive (no /r/ wrappers). */
  bodyForArchive: string
  /** HTML fragment with UTM (+ optional /r/ wrappers) when htmlBody was provided. */
  htmlForSend?: string
  htmlForArchive?: string
  links: TrackedLink[]
  utmCampaign: string
}

function replaceUrlAtIndex(text: string, targetUrl: string, replacement: string): string {
  const re = new RegExp(escapeRegExp(targetUrl), 'g')
  let replaced = false
  return text.replace(re, () => {
    if (replaced) return targetUrl
    replaced = true
    return replacement
  })
}

function replaceHrefUrl(html: string, targetUrl: string, replacement: string): string {
  const esc = escapeRegExp(targetUrl)
  const re = new RegExp(`href\\s*=\\s*(["'])${esc}\\1`, 'gi')
  let replaced = false
  return html.replace(re, (_m, quote: string) => {
    if (replaced) return `href=${quote}${targetUrl}${quote}`
    replaced = true
    return `href=${quote}${replacement}${quote}`
  })
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Tag URLs with UTM, optionally rewrite to /r/{sendId}/{idx} click trackers. */
export async function prepareTrackedNewsletterSend(
  opts: PrepareTrackedSendOpts,
): Promise<PreparedTrackedSend> {
  const utmBody = tagUrlsInText(opts.body, opts.utm)
  const htmlRaw = String(opts.htmlBody ?? '').trim()
  const utmHtml = htmlRaw ? tagUrlsInHtml(htmlRaw, opts.utm) : undefined
  const urls = extractTrackedUrls(utmBody, utmHtml)
  const links: TrackedLink[] = urls.map((url, idx) => ({ idx, url, clicks: 0 }))

  const client = getWixClient()
  const inserted = await client.items.insert('NewsletterSends', {
    templateId: opts.templateId?.trim() || null,
    subject: opts.subject.trim(),
    body: utmBody,
    linksJson: JSON.stringify(links),
    utmCampaign: opts.utm.campaign,
    tier: opts.tier || 'all',
    grade: opts.grade || null,
    recipientCount: opts.recipientCount,
    openCount: 0,
    clickCount: 0,
    sentAt: new Date().toISOString(),
    sentByEmail: opts.sentByEmail.trim().toLowerCase(),
    active: true,
  })
  const sendId = String((inserted as { _id?: string })._id ?? '')
  if (!sendId) throw new Error('Could not create newsletter send record')

  if (!opts.trackClicks || !links.length) {
    return {
      sendId,
      bodyForSend: utmBody,
      bodyForArchive: utmBody,
      htmlForSend: utmHtml,
      htmlForArchive: utmHtml,
      links,
      utmCampaign: opts.utm.campaign,
    }
  }

  const origin = newsletterSiteOrigin()
  let bodyForSend = utmBody
  let htmlForSend = utmHtml
  for (const link of links) {
    const tracked = `${origin}/r/${sendId}/${link.idx}`
    bodyForSend = replaceUrlAtIndex(bodyForSend, link.url, tracked)
    if (htmlForSend) {
      htmlForSend = replaceHrefUrl(htmlForSend, link.url, tracked)
    }
  }

  await client.items.update('NewsletterSends', {
    _id: sendId,
    body: bodyForSend,
    linksJson: JSON.stringify(links),
  })

  return {
    sendId,
    bodyForSend,
    bodyForArchive: utmBody,
    htmlForSend,
    htmlForArchive: utmHtml,
    links,
    utmCampaign: opts.utm.campaign,
  }
}

export async function recordNewsletterClick(sendId: string, linkIdx: number): Promise<string | null> {
  const client = getWixClient()
  const row = await client.items.get('NewsletterSends', sendId).catch(() => null)
  if (!row) return null
  const data = row as {
    linksJson?: string
    clickCount?: number
    active?: boolean
  }
  if (data.active === false) return null

  let links: TrackedLink[] = []
  try {
    links = JSON.parse(String(data.linksJson ?? '[]')) as TrackedLink[]
  } catch {
    return null
  }
  const link = links.find((l) => l.idx === linkIdx)
  if (!link) return null
  link.clicks = (link.clicks ?? 0) + 1

  await client.items.update('NewsletterSends', {
    _id: sendId,
    linksJson: JSON.stringify(links),
    clickCount: Number(data.clickCount ?? 0) + 1,
  })

  return link.url
}

export async function recordNewsletterOpen(sendId: string): Promise<void> {
  const client = getWixClient()
  const row = await client.items.get('NewsletterSends', sendId).catch(() => null)
  if (!row) return
  const data = row as { openCount?: number; active?: boolean }
  if (data.active === false) return
  await client.items.update('NewsletterSends', {
    _id: sendId,
    openCount: Number(data.openCount ?? 0) + 1,
  })
}

export function openPixelUrl(sendId: string): string {
  return `${newsletterSiteOrigin()}/api/o/${encodeURIComponent(sendId)}`
}
