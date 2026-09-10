/**
 * Resolve which company product's fleet a Platform / Brand Staff request should see.
 * Host wins (BR / AuraFlux brand host).
 * Email brand locks the fleet for that company (BR/AF email never sees other fleets).
 * Only Pavilion operators on the shared demo may override via cookie/query.
 */
import { companyBrandFromHost } from '@/lib/crm/product-host'
import {
  normalizeCompanyProduct,
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
  if (!v) return null
  if (v === 'businessrocket' || v === 'br' || v === 'auraflux' || v === 'af' || v === 'pavilion') {
    return normalizeCompanyProduct(v)
  }
  return null
}

/** Whether this operator may flip company fleets (Pavilion ↔ BR ↔ AuraFlux). */
export function canSwitchFleetProduct(opts: {
  host?: string
  email?: string
  demo?: boolean
}): boolean {
  if (opts.host && companyBrandFromHost(opts.host)) return false
  const brand = opts.email ? platformBrandForEmail(opts.email) : null
  // Brand Staff emails are locked to their own fleet everywhere.
  if (brand === 'businessrocket' || brand === 'auraflux') return false
  // Shared demo: Pavilion operators (and anonymous demo-gate sessions) can tour fleets.
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
    if (fromEmail === 'businessrocket' || fromEmail === 'auraflux') return fromEmail
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
    if (opts.product === 'businessrocket') return 'org_hskrg_br'
    if (opts.product === 'auraflux') return 'org_af_sandbox'
    return 'org_riverside'
  }
  return platformHomeOrgId(opts.product)
}
