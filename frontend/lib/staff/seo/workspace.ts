/**
 * SEO workspace ids: company brand (`pavilion` | `businessrocket` | `auraflux`)
 * or a client org slug. Regional/category first. No NoVA trades defaults.
 */
import type { CompanyProduct } from '@/lib/crm/platform-owners'

export type SeoGeoMode = 'local' | 'regional' | 'national'

export type SeoWorkspaceId = string

export type WorkspaceIntegration = {
  tool: 'gsc' | 'ga4'
  provider: 'google_direct'
  accountLabel: string
  externalAccountId: string | null
  propertyId: string | null
  status: 'connected' | 'disconnected'
  refreshTokenEnc: string
  scopes: string[]
  connectedAt: string
  updatedAt: string
}

export type SeoWorkspaceConfig = {
  id: SeoWorkspaceId
  kind: 'brand' | 'client'
  name: string
  domain: string
  origin: string
  geoMode: SeoGeoMode
  locations: string[]
  moneyUrls: string[]
  googleHd: string | null
  allowedGoogleEmails: string[]
  connection: {
    gscSiteUrl: string | null
    ga4PropertyId: string | null
    liveGoogle: boolean
    integrations: WorkspaceIntegration[]
  }
  updatedAt: string
}

export type GscQueryRow = {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type ContentIdea = {
  id: string
  query: string
  impressions: number
  clicks: number
  position: number
  reason: string
  status: 'idea' | 'planned' | 'drafted'
  createdAt: string
}

export type WorkspaceBundle = {
  config: SeoWorkspaceConfig
  ideas: ContentIdea[]
  metrics: {
    importedAt: string
    source: 'gsc_api' | 'fixture'
    rows: GscQueryRow[]
    totals: { clicks: number; impressions: number; queries: number }
  } | null
}

export const CLIENT_PERMISSIONS_COPY = `Google Search Console (read-only).
We never post, delete, or change your listings.
You can revoke access anytime in Google Account → Security → Third-party apps.`

const CATEGORY_LOCATIONS = [
  'PTO software',
  'PTA membership',
  'school parent organization',
  'booster club',
]

export function defaultOriginForProduct(product: CompanyProduct): { domain: string; origin: string; name: string; hd: string } {
  if (product === 'businessrocket') {
    return {
      name: 'Business Rocket',
      domain: 'businessrocket.ai',
      origin: 'https://www.businessrocket.ai',
      hd: 'businessrocket.ai',
    }
  }
  if (product === 'auraflux') {
    return {
      name: 'AuraFlux',
      domain: 'auraflux.co',
      origin: 'https://www.auraflux.co',
      hd: 'auraflux.co',
    }
  }
  return {
    name: 'Pavilion',
    domain: 'onpavilion.com',
    origin: 'https://onpavilion.com',
    hd: 'onpavilion.com',
  }
}

export function defaultBundle(opts: {
  workspaceId: string
  product: CompanyProduct
  kind?: 'brand' | 'client'
  name?: string
  domain?: string
  origin?: string
}): WorkspaceBundle {
  const brand = defaultOriginForProduct(opts.product)
  const domain = (opts.domain || brand.domain).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const origin = (opts.origin || `https://${domain}`).replace(/\/$/, '')
  const kind = opts.kind || (opts.workspaceId === opts.product ? 'brand' : 'client')
  return {
    config: {
      id: opts.workspaceId,
      kind,
      name: opts.name || brand.name,
      domain,
      origin,
      geoMode: 'regional',
      locations: [...CATEGORY_LOCATIONS],
      moneyUrls: ['/', '/pricing', '/blog', '/contact', '/work'],
      googleHd: kind === 'brand' ? brand.hd : null,
      allowedGoogleEmails: [],
      connection: {
        gscSiteUrl: null,
        ga4PropertyId: null,
        liveGoogle: false,
        integrations: [],
      },
      updatedAt: new Date().toISOString(),
    },
    ideas: [],
    metrics: null,
  }
}

export function googleAccountAllowedForWorkspace(
  config: Pick<SeoWorkspaceConfig, 'googleHd' | 'allowedGoogleEmails'>,
  email: string | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!email) return { ok: true }
  const allow = (config.allowedGoogleEmails || []).map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (allow.length && allow.includes(email.toLowerCase())) return { ok: true }
  const hd = config.googleHd?.trim().toLowerCase()
  if (hd && !email.toLowerCase().endsWith(`@${hd}`)) {
    if (allow.length) {
      return { ok: false, reason: `Google account must be @${hd} or on the allowlist.` }
    }
    return { ok: false, reason: `Google account must be @${hd}.` }
  }
  return { ok: true }
}

export function workspaceIdForProduct(product: CompanyProduct): string {
  return product
}

export function publicStaffOrigin(reqUrl: string): string {
  const explicit = process.env.SEO_GOOGLE_REDIRECT_URI?.trim()
  if (explicit) {
    try {
      return new URL(explicit).origin
    } catch {
      /* fall through */
    }
  }
  try {
    return new URL(reqUrl).origin
  } catch {
    return 'https://demo.onpavilion.com'
  }
}
