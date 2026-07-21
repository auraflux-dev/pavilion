/**
 * Proxies Wix-managed login routes (/_api/*, /__auth/*) to Wix edge with
 * Host: www.shmspto.org. After DNS cutover, those paths hit Vercel (404);
 * Wix still serves them when the Host header matches the connected domain.
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
  const pathWithQuery = `${wixPath}${url.search}`
  const method = req.method.toUpperCase()
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : Buffer.from(await req.arrayBuffer())

  const incomingHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    // Don't forward Vercel/compressed encodings that can confuse upstream
    if (lower === 'accept-encoding') return
    incomingHeaders[key] = value
  })
  incomingHeaders.host = PUBLIC_HOST
  incomingHeaders['x-forwarded-host'] = PUBLIC_HOST
  incomingHeaders['x-forwarded-proto'] = 'https'

  const upstream = await new Promise<{
    status: number
    headers: Record<string, string | string[] | undefined>
    body: Buffer
  }>((resolve, reject) => {
    const request = https.request(
      {
        host: address,
        servername: PUBLIC_HOST,
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
    if (Array.isArray(value)) {
      for (const v of value) outHeaders.append(key, v)
    } else {
      outHeaders.set(key, value)
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
  // Rewrites pass /_api/... or /__auth/... into this catch-all
  const wixPath = `/${path.join('/')}`
  if (!wixPath.startsWith('/_api/') && !wixPath.startsWith('/__auth/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    return await proxyToWix(req, wixPath)
  } catch (err) {
    console.error('wix-auth-proxy', err)
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
