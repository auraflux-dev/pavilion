/**
 * Free BYOD site audit — no Ahrefs / paid SERP APIs.
 * Used by Brand Staff SEO tool and CLI (`npm run audit:links`).
 *
 * Pavilion note: keep this module product-agnostic (origin + options only)
 * so Brand Staff on Pavilion can call the same runner later.
 */

export const SEO_AUDIT_USER_AGENT =
  'PavilionSeoAudit/1.0 (+https://onpavilion.com; free BYOD staff tool; no Ahrefs)'

const DEFAULT_SKIP = ['/api/', '/portal', '/member-portal', '/staff', '/_next/'] as const

export type OnPageSignals = {
  title: string | null
  titleLength: number
  metaDescription: string | null
  metaDescriptionLength: number
  canonical: string | null
  robots: string | null
  h1Count: number
  h1Texts: string[]
  ogTitle: string | null
  twitterCard: string | null
  issues: string[]
}

export type ProbeResult = {
  url: string
  status: number
  finalUrl: string
  redirects: string[]
  error?: string
  contentType?: string
  onPage?: OnPageSignals
}

export type SiteAuditReport = {
  generatedAt: string
  origin: string
  productHint: 'businessrocket' | 'pavilion' | 'external'
  options: {
    maxPages: number
    concurrency: number
    checkExternal: boolean
    skipPathPrefixes: string[]
  }
  counts: {
    pagesCrawled: number
    linkEdges: number
    internal3xx: number
    redirectChains: number
    linksToRedirect: number
    external4xx: number
    external5xx: number
    externalTimeout: number
    httpLinksFromHttps: number
    thinInternal: number
    onPageIssues: number
  }
  indexNow: {
    configured: boolean
    keys: { url: string; status: number; preview: string }[]
    note: string
  }
  internal3xx: { url: string; status: number; chain: string[]; finalUrl: string }[]
  redirectChains: { url: string; status: number; chain: string[]; finalUrl: string }[]
  linksToRedirect: { from: string; to: string; chain: string[]; finalUrl: string }[]
  external4xx: { url: string; status: number; error?: string }[]
  external5xx: { url: string; status: number; error?: string }[]
  externalTimeout: { url: string; error: string }[]
  httpLinksFromHttps: { from: string; to: string }[]
  thinInternal: { url: string; inbound: number; from: string[] }[]
  onPageIssues: { url: string; issues: string[]; onPage: OnPageSignals }[]
  sitemapOrCrawled: {
    url: string
    status?: number
    redirects: number
    inbound: number
    title?: string | null
  }[]
}

export type RunSiteAuditOptions = {
  origin: string
  maxPages?: number
  concurrency?: number
  checkExternal?: boolean
  skipPathPrefixes?: string[]
  productHint?: SiteAuditReport['productHint']
  signal?: AbortSignal
}

function sameOrigin(url: string, origin: string) {
  try {
    return new URL(url).origin === new URL(origin).origin
  } catch {
    return false
  }
}

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base)
    u.hash = ''
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return null
  }
}

function shouldSkipCrawl(url: string, prefixes: string[]) {
  try {
    const { pathname } = new URL(url)
    return prefixes.some(
      (p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
    )
  } catch {
    return true
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>) {
  const results = new Array<R>(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()))
  return results
}

function metaContent(html: string, attr: 'name' | 'property', key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`,
    'i',
  )
  const m = re.exec(html)
  return (m?.[1] || m?.[2] || '').trim() || null
}

export function extractOnPage(html: string, pageUrl: string): OnPageSignals {
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : null
  const metaDescription = metaContent(html, 'name', 'description')
  const robots = metaContent(html, 'name', 'robots')
  const ogTitle = metaContent(html, 'property', 'og:title')
  const twitterCard = metaContent(html, 'name', 'twitter:card')

  let canonical: string | null = null
  const canM =
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i.exec(
      html,
    )
  if (canM) canonical = normalizeUrl(canM[1] || canM[2], pageUrl)

  const h1Texts: string[] = []
  const h1Re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi
  let hm
  while ((hm = h1Re.exec(html))) {
    const text = hm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) h1Texts.push(text)
  }

  const issues: string[] = []
  if (!title) issues.push('missing_title')
  else if (title.length > 60) issues.push('title_too_long')
  else if (title.length < 15) issues.push('title_too_short')
  if (!metaDescription) issues.push('missing_meta_description')
  else if (metaDescription.length > 160) issues.push('meta_description_too_long')
  else if (metaDescription.length < 50) issues.push('meta_description_too_short')
  if (!canonical) issues.push('missing_canonical')
  if (h1Texts.length === 0) issues.push('missing_h1')
  if (h1Texts.length > 1) issues.push('multiple_h1')
  if (!ogTitle) issues.push('missing_og_title')
  if (!twitterCard) issues.push('missing_twitter_card')

  return {
    title,
    titleLength: title?.length || 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    canonical,
    robots,
    h1Count: h1Texts.length,
    h1Texts: h1Texts.slice(0, 5),
    ogTitle,
    twitterCard,
    issues,
  }
}

function extractLinks(html: string, pageUrl: string) {
  const out: { href: string; nofollow: boolean }[] = []
  const re = /<a\b([^>]*)>/gi
  let m
  while ((m = re.exec(html))) {
    const attrs = m[1]
    const hrefM = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs)
    if (!hrefM) continue
    const raw = hrefM[1] || hrefM[2] || hrefM[3] || ''
    if (
      !raw ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('sms:') ||
      raw.startsWith('javascript:')
    ) {
      continue
    }
    const abs = normalizeUrl(raw, pageUrl)
    if (!abs) continue
    const rel = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
    const relVal = (rel?.[1] || rel?.[2] || '').toLowerCase()
    out.push({ href: abs, nofollow: /\bnofollow\b/.test(relVal) })
  }
  return out
}

async function probe(
  url: string,
  opts: { fetchBody?: boolean; signal?: AbortSignal },
): Promise<ProbeResult & { html?: string }> {
  const redirects: string[] = []
  let current = url
  let status = 0
  let finalUrl = url
  let contentType = ''
  let html = ''
  let error: string | undefined
  let onPage: OnPageSignals | undefined

  try {
    for (let hop = 0; hop < 8; hop++) {
      opts.signal?.throwIfAborted()
      const res = await fetch(current, {
        method: 'GET',
        headers: {
          'user-agent': SEO_AUDIT_USER_AGENT,
          accept: opts.fetchBody ? 'text/html,*/*' : '*/*',
        },
        redirect: 'manual',
        signal: opts.signal,
      })
      status = res.status
      contentType = res.headers.get('content-type') || ''
      const loc = res.headers.get('location')

      if (status >= 300 && status < 400 && loc) {
        const next = normalizeUrl(loc, current) || loc
        redirects.push(`${status} → ${next}`)
        current = next
        finalUrl = next
        continue
      }

      finalUrl = current
      if (opts.fetchBody && status >= 200 && status < 300 && /text\/html/i.test(contentType)) {
        html = await res.text()
        onPage = extractOnPage(html, finalUrl)
      } else {
        try {
          await res.arrayBuffer()
        } catch {
          /* ignore */
        }
      }
      break
    }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } }
    error = err.cause?.code || err.message || String(e)
    status = 0
  }

  return { url, status, finalUrl, redirects, error, contentType, html, onPage }
}

function parseSitemapUrls(xml: string) {
  const urls: string[] = []
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let m
  while ((m = locRe.exec(xml))) urls.push(m[1].trim())
  return { kind: /<sitemapindex/i.test(xml) ? ('index' as const) : ('urlset' as const), urls }
}

async function loadSeedUrls(origin: string, signal?: AbortSignal) {
  const seeds = new Set<string>([`${origin}/`])
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { 'user-agent': SEO_AUDIT_USER_AGENT, accept: 'application/xml,text/html,*/*' },
      redirect: 'follow',
      signal,
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const xml = await res.text()
    const first = parseSitemapUrls(xml)
    if (first.kind === 'index') {
      for (const child of first.urls.slice(0, 20)) {
        try {
          const childRes = await fetch(child, {
            headers: { 'user-agent': SEO_AUDIT_USER_AGENT },
            redirect: 'follow',
            signal,
          })
          if (!childRes.ok) continue
          for (const u of parseSitemapUrls(await childRes.text()).urls) {
            seeds.add(normalizeUrl(u, origin) || u)
          }
        } catch {
          /* ignore */
        }
      }
    } else {
      for (const u of first.urls) seeds.add(normalizeUrl(u, origin) || u)
    }
  } catch {
    /* sitemap optional */
  }
  return [...seeds].filter(Boolean)
}

async function checkIndexNow(origin: string, signal?: AbortSignal) {
  const candidates = [
    `${origin}/indexnow-key.txt`,
    `${origin}/IndexNowKey.txt`,
    `${origin}/.well-known/indexnow-key.txt`,
  ]
  const found: { url: string; status: number; preview: string }[] = []
  for (const u of candidates) {
    try {
      const res = await fetch(u, {
        headers: { 'user-agent': SEO_AUDIT_USER_AGENT },
        redirect: 'follow',
        signal,
      })
      if (res.ok) {
        found.push({ url: u, status: res.status, preview: (await res.text()).trim().slice(0, 80) })
      }
    } catch {
      /* ignore */
    }
  }
  return {
    configured: found.length > 0,
    keys: found,
    note: found.length
      ? 'IndexNow key file found — POST changed URLs to api.indexnow.org for free (Bing/Yandex).'
      : 'No IndexNow key on origin. Optional; GSC + sitemap still work. $0.',
  }
}

/** Normalize domain or URL → https origin (no trailing slash). */
export function originFromDomain(input: string): string {
  const raw = input.trim()
  if (!raw) throw new Error('domain required')
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const u = new URL(withProto)
  return u.origin.replace(/\/$/, '')
}

export async function runSiteAudit(options: RunSiteAuditOptions): Promise<SiteAuditReport> {
  const origin = originFromDomain(options.origin)
  const maxPages = Math.min(Math.max(options.maxPages ?? 40, 1), 500)
  const concurrency = Math.max(1, options.concurrency ?? 6)
  const checkExternal = options.checkExternal ?? false
  const skipPathPrefixes = [...(options.skipPathPrefixes ?? DEFAULT_SKIP)]
  const signal = options.signal

  const seeds = await loadSeedUrls(origin, signal)
  const pageProbes = new Map<string, ProbeResult & { html?: string }>()
  const inbound = new Map<string, Set<string>>()
  const linkEdges: { from: string; to: string }[] = []
  const queue = new Set(
    seeds.filter((u) => sameOrigin(u, origin) && !shouldSkipCrawl(u, skipPathPrefixes)),
  )

  while (queue.size && pageProbes.size < maxPages) {
    signal?.throwIfAborted()
    const batch = [...queue].slice(0, concurrency)
    for (const u of batch) queue.delete(u)

    const probes = await mapPool(batch, concurrency, async (url) => {
      if (pageProbes.has(url)) return null
      return probe(url, { fetchBody: true, signal })
    })

    for (const p of probes) {
      if (!p) continue
      pageProbes.set(p.url, p)
      if (!p.html || p.redirects.length) continue
      for (const { href, nofollow } of extractLinks(p.html, p.finalUrl || p.url)) {
        linkEdges.push({ from: p.url, to: href })
        if (sameOrigin(href, origin)) {
          if (!nofollow) {
            if (!inbound.has(href)) inbound.set(href, new Set())
            inbound.get(href)!.add(p.url)
          }
          const n = normalizeUrl(href, origin)
          if (
            n &&
            !pageProbes.has(n) &&
            !queue.has(n) &&
            !shouldSkipCrawl(n, skipPathPrefixes) &&
            pageProbes.size + queue.size < maxPages
          ) {
            queue.add(n)
          }
        }
      }
    }
  }

  const linkedTargets = [...new Set(linkEdges.map((e) => e.to))]
  const needStatus = linkedTargets.filter((u) => !pageProbes.has(u))
  const toProbe = checkExternal
    ? needStatus.slice(0, 800)
    : needStatus.filter((u) => sameOrigin(u, origin)).slice(0, 400)

  const linkProbes = new Map<string, ProbeResult>(pageProbes)
  await mapPool(toProbe, concurrency, async (url) => {
    if (linkProbes.has(url)) return
    linkProbes.set(url, await probe(url, { fetchBody: false, signal }))
  })

  const internal3xx = [...pageProbes.values()]
    .filter((p) => p.redirects.length > 0)
    .map((p) => ({
      url: p.url,
      status: p.status,
      chain: p.redirects,
      finalUrl: p.finalUrl,
    }))
  const redirectChains = internal3xx.filter((p) => p.chain.length > 1)

  const linksToRedirect: SiteAuditReport['linksToRedirect'] = []
  for (const { from, to } of linkEdges) {
    const p = linkProbes.get(to)
    if (p && p.redirects.length > 0) {
      linksToRedirect.push({ from, to, chain: p.redirects, finalUrl: p.finalUrl })
    }
  }

  const external4xx: SiteAuditReport['external4xx'] = []
  const external5xx: SiteAuditReport['external5xx'] = []
  const externalTimeout: SiteAuditReport['externalTimeout'] = []
  for (const [url, p] of linkProbes) {
    if (sameOrigin(url, origin)) continue
    if (p.error && /timeout|AbortError|UND_ERR_CONNECT|ENOTFOUND|ECONN/i.test(p.error)) {
      externalTimeout.push({ url, error: p.error })
    } else if (p.status >= 400 && p.status < 500) {
      external4xx.push({ url, status: p.status, error: p.error })
    } else if (p.status >= 500 || (p.status === 0 && p.error)) {
      external5xx.push({ url, status: p.status, error: p.error })
    }
  }

  const httpLinksFromHttps = linkEdges.filter(
    ({ from, to }) => from.startsWith('https:') && to.startsWith('http:'),
  )

  const thinInternal = [...pageProbes.keys()]
    .filter((u) => sameOrigin(u, origin) && !shouldSkipCrawl(u, skipPathPrefixes))
    .filter((u) => {
      const p = pageProbes.get(u)
      if (!p || p.redirects.length) return false
      return (inbound.get(u)?.size || 0) <= 1
    })
    .map((u) => ({
      url: u,
      inbound: inbound.get(u)?.size || 0,
      from: [...(inbound.get(u) || [])],
    }))
    .sort((a, b) => a.inbound - b.inbound)

  const onPageIssues = [...pageProbes.values()]
    .filter((p) => p.onPage && p.onPage.issues.length && !p.redirects.length)
    .map((p) => ({ url: p.url, issues: p.onPage!.issues, onPage: p.onPage! }))

  const indexNow = await checkIndexNow(origin, signal)

  return {
    generatedAt: new Date().toISOString(),
    origin,
    productHint: options.productHint ?? 'businessrocket',
    options: { maxPages, concurrency, checkExternal, skipPathPrefixes },
    counts: {
      pagesCrawled: pageProbes.size,
      linkEdges: linkEdges.length,
      internal3xx: internal3xx.length,
      redirectChains: redirectChains.length,
      linksToRedirect: linksToRedirect.length,
      external4xx: external4xx.length,
      external5xx: external5xx.length,
      externalTimeout: externalTimeout.length,
      httpLinksFromHttps: httpLinksFromHttps.length,
      thinInternal: thinInternal.length,
      onPageIssues: onPageIssues.length,
    },
    indexNow,
    internal3xx,
    redirectChains,
    linksToRedirect,
    external4xx,
    external5xx,
    externalTimeout,
    httpLinksFromHttps,
    thinInternal,
    onPageIssues,
    sitemapOrCrawled: [...pageProbes.keys()].map((url) => ({
      url,
      status: pageProbes.get(url)?.status,
      redirects: pageProbes.get(url)?.redirects?.length || 0,
      inbound: inbound.get(url)?.size || 0,
      title: pageProbes.get(url)?.onPage?.title ?? null,
    })),
  }
}
