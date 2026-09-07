/**
 * Suggest logo / colors from a school or PTO website URL (Staff brand onboarding).
 * SSRF-hardened: https only, no private hosts, short timeout, size cap.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 512_000
const TIMEOUT_MS = 8_000

function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    return (
      v === '::1' ||
      v.startsWith('fc') ||
      v.startsWith('fd') ||
      v.startsWith('fe80') ||
      v === '::'
    )
  }
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('Enter a full URL starting with https://')
  }
  if (url.protocol !== 'https:') {
    throw new Error('Use an https:// URL.')
  }
  if (url.username || url.password) {
    throw new Error('URL must not include credentials.')
  }
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('That host is not allowed.')
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('That host is not allowed.')
  } else {
    const records = await lookup(host, { all: true, verbatim: true }).catch(() => [])
    if (!records.length) throw new Error('Could not resolve that host.')
    for (const r of records) {
      if (isPrivateIp(r.address)) throw new Error('That host is not allowed.')
    }
  }
  return url
}

function absUrl(base: URL, href: string | undefined): string {
  if (!href?.trim()) return ''
  try {
    return new URL(href.trim(), base).toString()
  } catch {
    return ''
  }
}

function metaContent(html: string, ...names: string[]): string {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    )
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      'i',
    )
    const m = html.match(re) || html.match(re2)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function linkHref(html: string, relPart: string): string {
  const re = new RegExp(
    `<link[^>]+rel=["'][^"']*${relPart}[^"']*["'][^>]+href=["']([^"']+)["']`,
    'i',
  )
  const re2 = new RegExp(
    `<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${relPart}[^"']*["']`,
    'i',
  )
  const m = html.match(re) || html.match(re2)
  return m?.[1]?.trim() || ''
}

function titleText(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim() || ''
}

export type BrandSuggestion = {
  sourceUrl: string
  logoUrl: string
  faviconUrl: string
  colorPrimary: string
  siteTitle: string
  notes: string[]
}

export async function suggestBrandFromUrl(rawUrl: string): Promise<BrandSuggestion> {
  const url = await assertPublicHttpUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let html = ''
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'PavilionBrandSuggest/1.0 (+https://onpavilion.com)',
      },
    })
    if (!res.ok) throw new Error(`Could not fetch that page (${res.status}).`)
    const ctype = res.headers.get('content-type') || ''
    if (!ctype.includes('text/html') && !ctype.includes('application/xhtml')) {
      throw new Error('That URL did not return an HTML page.')
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) throw new Error('Page is too large to scan.')
    html = new TextDecoder('utf-8').decode(buf)
  } finally {
    clearTimeout(timer)
  }

  const notes: string[] = []
  const ogImage = absUrl(url, metaContent(html, 'og:image', 'twitter:image'))
  const apple = absUrl(url, linkHref(html, 'apple-touch-icon'))
  const icon = absUrl(url, linkHref(html, 'icon'))
  const shortcut = absUrl(url, linkHref(html, 'shortcut icon'))
  const theme = metaContent(html, 'theme-color')
  const siteTitle = titleText(html) || metaContent(html, 'og:site_name', 'og:title')

  const logoUrl = ogImage || apple || icon || shortcut
  const faviconUrl = icon || shortcut || apple || ''
  if (!logoUrl) notes.push('No logo image found. Upload a logo in Brand, or try another page URL.')
  else if (ogImage) notes.push('Used Open Graph image as logo suggestion.')
  else notes.push('Used favicon / apple-touch-icon as logo suggestion.')

  let colorPrimary = ''
  if (/^#[0-9a-fA-F]{3,8}$/.test(theme)) {
    colorPrimary = theme.length === 4
      ? `#${theme[1]}${theme[1]}${theme[2]}${theme[2]}${theme[3]}${theme[3]}`
      : theme.slice(0, 7)
    notes.push('Picked theme-color from the page.')
  } else {
    notes.push('No theme-color meta. Set colors in Brand after you apply.')
  }

  return {
    sourceUrl: url.toString(),
    logoUrl,
    faviconUrl,
    colorPrimary,
    siteTitle,
    notes,
  }
}
