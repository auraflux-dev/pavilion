/**
 * Resolve which company product's fleet a Platform / Brand Staff request should see.
 * Host wins (BR brand host → businessrocket).
 * Email brand locks the fleet for that company (BR email never sees Pavilion tenants).
 * Only Pavilion operators on the shared demo may override via cookie/query.
 */
import { companyBrandFromHost } from '@/lib/crm/product-host'
import {
  platformBrandForEmail,
  platformHomeOrgId,
  type CompanyProduct,
} from '@/lib/crm/platform-owners'
import { hostFromRequest } from '@/lib/demo/instance'

/** Remembers fleet product on shared demo for dual-operator (@onpavilion.com) sessions. */
export const FLEET_PRODUCT_COOKIE = 'pavilion_fleet_product'

export function parseCompanyProduct(raw: string | undefined | null): CompanyProduct | null {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'businessrocket' || v === 'br') return 'businessrocket'
  if (v === 'pavilion') return 'pavilion'
  return null
}

/** Whether this operator may flip Pavilion ↔ Business Rocket fleets. */
export function canSwitchFleetProduct(opts: {
  host?: string
  email?: string
  demo?: boolean
}): boolean {
  if (opts.host && companyBrandFromHost(opts.host)) return false
  const brand = opts.email ? platformBrandForEmail(opts.email) : null
  // Brand Staff (@businessrocket.ai) is locked to the BR fleet everywhere.
  if (brand === 'businessrocket') return false
  // Shared demo: Pavilion operators (and anonymous demo-gate sessions) can tour both fleets.
  if (opts.demo) return true
  return false
}

export function resolveFleetProduct(opts: {
  host?: string
  email?: string
  /** Explicit override (query/cookie) when allowed. */
  override?: CompanyProduct | null
}): CompanyProduct {
  if (opts.host) {
    const fromHost = companyBrandFromHost(opts.host)
    if (fromHost) return fromHost
  }
  // Email brand always wins over cookie/query for company Staff.
  if (opts.email) {
    const fromEmail = platformBrandForEmail(opts.email)
    if (fromEmail === 'businessrocket') return 'businessrocket'
    if (fromEmail === 'pavilion' && opts.override) return opts.override
    if (fromEmail) return fromEmail
  }
  if (opts.override) return opts.override
  return 'pavilion'
}

export function resolveFleetProductFromRequest(
  req: {
    headers: { get(name: string): string | null }
    cookies?: { get(name: string): { value: string } | undefined }
    nextUrl?: { searchParams: URLSearchParams }
  },
  email?: string,
  opts?: { demo?: boolean; allowOverride?: boolean },
): CompanyProduct {
  const host = hostFromRequest(req)
  const allowOverride =
    opts?.allowOverride === true ||
    canSwitchFleetProduct({ host, email, demo: opts?.demo === true })

  let override: CompanyProduct | null = null
  if (allowOverride) {
    const fromQuery = parseCompanyProduct(req.nextUrl?.searchParams?.get('product') ?? null)
    const fromCookie = parseCompanyProduct(req.cookies?.get(FLEET_PRODUCT_COOKIE)?.value ?? null)
    override = fromQuery || fromCookie
  }

  return resolveFleetProduct({ host, email, override })
}

export function defaultSelectedOrgId(opts: {
  demo?: boolean
  product: CompanyProduct
}): string {
  if (opts.demo) {
    return opts.product === 'businessrocket' ? 'org_hskrg_br' : 'org_riverside'
  }
  return platformHomeOrgId(opts.product)
}
