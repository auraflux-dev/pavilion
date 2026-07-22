/**
 * Final site audit (Screaming Frog equivalent): crawl + status codes + broken links
 * + Sapling grammar sample on public page text.
 *
 * Usage:
 *   BASE=https://www.shmspto.org SAPLING_API_KEY=xxx node scripts/site-final-audit.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const BASE = (process.env.BASE || 'https://www.shmspto.org').replace(/\/$/, '')
const SAPLING = process.env.SAPLING_API_KEY?.trim() || ''
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../tmp/site-audit')
const MAX_PAGES = Number(process.env.MAX_PAGES || 80)
const CONCURRENCY = 4

const SEED = [
  '/',
  '/membership',
  '/cove',
  '/fundraising',
  '/programs',
  '/events',
  '/volunteer',
  '/board',
  '/meetings',
  '/contact',
  '/newsletter',
  '/auth/login',
  '/data-security',
  '/privacy',
  '/terms',
  '/api/health',
  '/member-portal',
  '/staff',
]

const SKIP_EXT = /\.(png|jpe?g|gif|webp|svg|ico|pdf|css|js|map|woff2?|ttf|mp4|webm)(\?|$)/i

mkdirSync(OUT, { recursive: true })

function abs(href, from) {
  try {
    const u = new URL(href, from)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    u.hash = ''
    return u
  } catch {
    return null
  }
}

function sameHost(u) {
  const baseHost = new URL(BASE).hostname.replace(/^www\./, '')
  const h = u.hostname.replace(/^www\./, '')
  return h === baseHost || h.endsWith('.vercel.app')
}

function extractLinks(html, pageUrl) {
  const links = []
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html))) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue
    const u = abs(raw, pageUrl)
    if (!u) continue
    links.push(u.toString())
  }
  return links
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchUrl(url) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'SHMS-PTO-SiteAudit/1.0 (+final-review)' },
    })
    const loc = res.headers.get('location')
    let body = ''
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
      body = await res.text()
    } else {
      await res.arrayBuffer().catch(() => null)
    }
    return {
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      redirectTo: loc || null,
      contentType: ct,
      body,
      ms: Date.now() - started,
    }
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      redirectTo: null,
      contentType: '',
      body: '',
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function mapPool(items, limit, fn) {
  const out = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

async function saplingCheck(text) {
  if (!SAPLING || !text.trim()) return null
  const chunk = text.slice(0, 8000)
  const res = await fetch('https://api.sapling.ai/api/v1/edits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: SAPLING,
      text: chunk,
      session_id: 'shmspto-final-audit',
      auto_apply: false,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.msg || data.error || res.status }
  const edits = Array.isArray(data.edits) ? data.edits : []
  return {
    ok: true,
    editCount: edits.length,
    samples: edits.slice(0, 12).map((e) => ({
      type: e.general_error_type || e.error_type,
      from: chunk.slice(e.start, e.end),
      to: e.replacement,
      sentence: e.sentence,
    })),
  }
}

const queue = [...SEED.map((p) => `${BASE}${p}`)]
const seen = new Set()
const pages = []
const allLinks = new Map() // url -> { from: Set }

while (queue.length && pages.length < MAX_PAGES) {
  const batch = []
  while (queue.length && batch.length < CONCURRENCY && pages.length + batch.length < MAX_PAGES) {
    const url = queue.shift()
    if (!url || seen.has(url)) continue
    if (SKIP_EXT.test(url)) continue
    seen.add(url)
    batch.push(url)
  }
  if (!batch.length) break

  const results = await mapPool(batch, CONCURRENCY, fetchUrl)
  for (const r of results) {
    pages.push(r)
    if (!r.body || !(r.contentType || '').includes('text/html')) continue
    if (r.status >= 300 && r.status < 400) {
      if (r.redirectTo) {
        const next = abs(r.redirectTo, r.url)
        if (next && sameHost(next) && !seen.has(next.toString())) queue.push(next.toString())
      }
      continue
    }
    if (r.status !== 200) continue
    for (const href of extractLinks(r.body, r.url)) {
      if (!allLinks.has(href)) allLinks.set(href, { from: new Set() })
      allLinks.get(href).from.add(r.url)
      const u = new URL(href)
      if (sameHost(u) && !seen.has(href) && !SKIP_EXT.test(href)) {
        // keep crawl focused on site pages (no deep API spam)
        if (!u.pathname.startsWith('/api/') || u.pathname === '/api/health') {
          queue.push(href)
        }
      }
    }
  }
}

// Check external + remaining internal link targets (unique)
const linkTargets = [...allLinks.keys()].filter((u) => !SKIP_EXT.test(u))
const unchecked = linkTargets.filter((u) => !seen.has(u))
const probeList = unchecked.slice(0, 200)
const probed = await mapPool(probeList, CONCURRENCY, fetchUrl)

const byStatus = {}
for (const p of [...pages, ...probed]) {
  const k = String(p.status || 'ERR')
  byStatus[k] = (byStatus[k] || 0) + 1
}

const broken = [...pages, ...probed].filter(
  (p) => p.status === 0 || p.status >= 400,
)

const grammarPages = ['/', '/membership', '/fundraising', '/board', '/cove', '/events', '/volunteer']
const grammar = []
for (const path of grammarPages) {
  const page = pages.find((p) => p.url === `${BASE}${path}` || p.url === `${BASE}${path}/`)
  if (!page?.body) continue
  const text = extractText(page.body)
  const dashHits = (text.match(/[—–]/g) || []).length
  const result = await saplingCheck(text)
  grammar.push({
    url: page.url,
    chars: text.length,
    emDashCount: dashHits,
    sapling: result,
  })
}

const report = {
  base: BASE,
  crawledAt: new Date().toISOString(),
  pagesCrawled: pages.length,
  uniqueLinksFound: allLinks.size,
  statusCounts: byStatus,
  broken: broken.map((b) => ({
    url: b.url,
    status: b.status,
    error: b.error,
    from: [...(allLinks.get(b.url)?.from || [])].slice(0, 5),
  })),
  redirects: pages
    .filter((p) => p.status >= 300 && p.status < 400)
    .map((p) => ({ url: p.url, status: p.status, to: p.redirectTo })),
  authGated: pages
    .filter((p) => /\/(member-portal|staff)(\/|$|\?)/.test(p.url))
    .map((p) => ({ url: p.url, status: p.status, redirectTo: p.redirectTo })),
  grammar,
  sampleTitles: pages
    .filter((p) => p.body && p.status === 200)
    .slice(0, 20)
    .map((p) => {
      const m = p.body.match(/<title[^>]*>([^<]+)<\/title>/i)
      return { url: p.url, title: m?.[1]?.trim() || '' }
    }),
}

writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2))
writeFileSync(
  resolve(OUT, 'broken.csv'),
  ['url,status,error,from', ...report.broken.map((b) => `"${b.url}",${b.status},"${b.error || ''}","${(b.from || []).join(' | ')}"`)].join('\n'),
)

console.log(JSON.stringify({
  summary: {
    pagesCrawled: report.pagesCrawled,
    uniqueLinksFound: report.uniqueLinksFound,
    statusCounts: report.statusCounts,
    brokenCount: report.broken.length,
    redirectCount: report.redirects.length,
    grammarDashTotals: report.grammar.map((g) => ({ url: g.url, emDashCount: g.emDashCount, saplingEdits: g.sapling?.editCount ?? null })),
  },
  broken: report.broken,
  authGated: report.authGated,
  grammar: report.grammar.map((g) => ({
    url: g.url,
    emDashCount: g.emDashCount,
    saplingOk: g.sapling?.ok,
    editCount: g.sapling?.editCount,
    samples: g.sapling?.samples?.slice(0, 5),
    error: g.sapling?.error,
  })),
  out: OUT,
}, null, 2))
