/**
 * Proxies Wix-managed login routes (/_api/*, /__auth/*) to the free wixsite
 * host (SNI + Host = treasurer7596.wixsite.com, path prefixed with site name).
 * www no longer has a Wix TLS cert after DNS cutover.
 */
import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import { lookup } from 'dns/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUBLIC_HOST = 'www.shmspto.org'
const UPSTREAM_DNS =
  process.env.WIX_AUTH_UPSTREAM_HOST?.trim() || 'treasurer7596.wixsite.com'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

async function proxyToWix(req: NextRequest, wixPath: string) {
  const { address } = await lookup(UPSTREAM_DNS)
  const url = new URL(req.url)
  const sitePrefix =
    process.env.WIX_AUTH_SITE_PATH?.trim() || '/shms-pto-2026'
  const pathWithQuery = `${sitePrefix}${wixPath}${url.search}`
  const method = req.method.toUpperCase()
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : Buffer.from(await req.arrayBuffer())

  const incomingHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    // Don't forward hop/proxy noise that can confuse Wix auth
    if (
      lower === 'accept-encoding' ||
      lower.startsWith('x-vercel-') ||
      lower.startsWith('x-forwarded-') ||
      lower === 'forwarded' ||
      lower === 'via'
    ) {
      return
    }
    // Authorize: never forward cookies (stale svSession → unknown_error).
    // Login UI (/__auth, /_serverless, other /_api): forward Wix cookies, but
    // strip our app cookies so they do not confuse Wix session handling.
    if (lower === 'cookie') {
      if (wixPath.startsWith('/_api/oauth2/authorize')) return
      const filtered = value
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
        .filter(
          (c) =>
            !/^(wix_tokens|wix_oauth_data|shms_act_as)=/i.test(c)
        )
        .join('; ')
      if (filtered) incomingHeaders.cookie = filtered
      return
    }
    incomingHeaders[key] = value
  })
  // Host must match SNI (Wix CF 403s on Host/SNI mismatch). Path is prefixed
  // with the free wixsite site name so Wix resolves the correct meta-site.
  incomingHeaders.host = UPSTREAM_DNS
  incomingHeaders['x-forwarded-host'] = PUBLIC_HOST
  incomingHeaders['x-forwarded-proto'] = 'https'
  // Ensure Wix sees a normal browser navigation context
  if (!incomingHeaders['user-agent']) {
    incomingHeaders['user-agent'] =
      'Mozilla/5.0 (compatible; SHMSPTO-AuthProxy/1.0)'
  }
  if (!incomingHeaders.accept) {
    incomingHeaders.accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
  if (!incomingHeaders.referer) {
    incomingHeaders.referer = `https://${PUBLIC_HOST}/auth/login`
  }

  const upstream = await new Promise<{
    status: number
    headers: Record<string, string | string[] | undefined>
    body: Buffer
  }>((resolve, reject) => {
    const request = https.request(
      {
        host: address,
 // SNI must be the Wix upstream host. www.shmspto.org is no longer
        // on Wix TLS after DNS cutover (handshake failure → white-screen 502).
        servername: UPSTREAM_DNS,
        path: pathWithQuery,
        method,
        headers: {
          ...incomingHeaders,
          ...(body ? { 'content-length': String(body.length) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 502,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: Buffer.concat(chunks),
          })
        )
      }
    )
    request.on('error', reject)
    request.setTimeout(25000, () => {
      request.destroy(new Error('Wix auth proxy timeout'))
    })
    if (body) request.write(body)
    request.end()
  })

  const outHeaders = new Headers()
  for (const [key, value] of Object.entries(upstream.headers)) {
    if (!value) continue
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower) || lower === 'content-encoding') continue
    const values = Array.isArray(value) ? value : [value]
    for (let v of values) {
      if (lower === 'location') {
        try {
          const loc = new URL(v, `https://${UPSTREAM_DNS}`)
          if (
            loc.hostname === UPSTREAM_DNS &&
            (loc.pathname === sitePrefix ||
              loc.pathname.startsWith(`${sitePrefix}/`))
          ) {
            loc.hostname = PUBLIC_HOST
            loc.pathname =
              loc.pathname === sitePrefix
                ? '/'
                : loc.pathname.slice(sitePrefix.length) || '/'
            v = loc.toString()
          }
        } catch {
          /* keep original */
        }
      }
      if (lower === 'set-cookie') {
        v = v
          .replace(/Domain=[^;]+/gi, `Domain=.shmspto.org`)
          .replace(/;\s*Domain=[^;]+/gi, `; Domain=.shmspto.org`)
      }
      outHeaders.append(key, v)
    }
  }

  return new NextResponse(new Uint8Array(upstream.body), {
    status: upstream.status,
    headers: outHeaders,
  })
}

type Ctx = { params: Promise<{ path: string[] }> }

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  if (!path?.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Rewrites pass /_api, /__auth, /_serverless, /_partials into this catch-all.
  // `__wix_site_root` is the published Wix home (password-reset token dialog).
  let wixPath = `/${path.join('/')}`
  if (wixPath === '/__wix_site_root' || wixPath === '/__wix_site_root/') {
    wixPath = '/'
  }
  const allowed =
    wixPath === '/' ||
    wixPath.startsWith('/_api/') ||
    wixPath.startsWith('/__auth/') ||
    wixPath.startsWith('/_serverless/') ||
    wixPath.startsWith('/_partials/')
  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    return await proxyToWix(req, wixPath)
  } catch (err) {
    console.error('wix-auth-proxy', err)
    const accept = req.headers.get('accept') || ''
    if (accept.includes('text/html')) {
      return new NextResponse(
        `<!doctype html><html><head><meta charset="utf-8"/><title>Sign-in unavailable</title></head><body style="font-family:system-ui;padding:2rem;max-width:32rem"><h1>Sign-in temporarily unavailable</h1><p>Please go back and try <strong>email and password</strong> on the join page, or try again in a few minutes.</p><p><a href="/auth/join?mode=login">Back to log in</a></p></body></html>`,
        {
          status: 502,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }
      )
    }
    return NextResponse.json(
      { error: 'Login service temporarily unavailable' },
      { status: 502 }
    )
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
