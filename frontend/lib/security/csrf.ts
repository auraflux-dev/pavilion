/**
 * Same-origin check for cookie-authenticated mutating API calls.
 * Browser fetch from this host sends Origin; block cross-site POSTs.
 */
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'

function allowedOrigins(): string[] {
  const site = publicSiteUrl()
  const extras = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const set = new Set<string>([
    site,
    'https://www.shmspto.org',
    'https://shmspto.org',
    ...extras,
  ])
  if (isDemoInstance()) {
    set.add('https://commons-pto-demo.vercel.app')
  }
  if (process.env.COMMONS_PLATFORM === 'true') {
    set.add('https://commons-pto.vercel.app')
  }
  if (process.env.NODE_ENV !== 'production') {
    set.add('http://localhost:3000')
    set.add('http://127.0.0.1:3000')
    set.add('http://localhost:3001')
    set.add('http://127.0.0.1:3001')
  }
  return [...set]
}

function isLocalDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false
  try {
    const u = new URL(origin)
    return (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    )
  } catch {
    return false
  }
}

export function isSameOriginRequest(req: Request): boolean {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const allowed = allowedOrigins()
  const requestOrigin = new URL(req.url).origin

  if (origin) {
    if (origin === requestOrigin) return true
    if (allowed.some((a) => origin === a || origin.startsWith(`${a}/`))) return true
    return isLocalDevOrigin(origin)
  }
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (refOrigin === requestOrigin) return true
      if (allowed.includes(refOrigin)) return true
      return isLocalDevOrigin(refOrigin)
    } catch {
      return false
    }
  }

  // Non-browser clients (webhooks, cron, curl) often omit Origin.
  // Only allow when a trusted shared-secret style header is present,
  // or path is under /api/webhooks or /api/cron (those use their own secrets).
  const path = new URL(req.url).pathname
  if (path.startsWith('/api/webhooks/') || path.startsWith('/api/cron/')) return true
  if (path.startsWith('/api/wix-auth-proxy/')) return true
  if (req.headers.get('authorization')?.startsWith('Bearer ')) return true

 // Public forms may be posted without Origin in some older browsers. allow
  // contact/volunteer/newsletter/surveys which are not cookie-session APIs.
  if (
    path.startsWith('/api/contact') ||
    path.startsWith('/api/volunteer') ||
    path.startsWith('/api/newsletter') ||
    path.startsWith('/api/surveys/') ||
    path === '/api/auth/preview-handoff'
  ) {
    return true
  }

  return false
}

export function csrfForbiddenResponse() {
  return Response.json({ error: 'Forbidden origin' }, { status: 403 })
}
