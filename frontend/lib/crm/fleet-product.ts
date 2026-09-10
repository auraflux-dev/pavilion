/**
 * Resolve which company product's fleet a Platform Staff request should see.
 * Host wins (BR brand host → businessrocket); else email domain; else pavilion.
 * On shared demo host, operators can override via cookie/query (Pavilion ↔ BR).
 */
import { companyBrandFromHost } from '@/lib/crm/product-host'
import {
  isPlatformStaffEmail,
  platformBrandForEmail,
  platformHomeOrgId,
  type CompanyProduct,
} from '@/lib/crm/platform-owners'
import { hostFromRequest } from '@/lib/demo/instance'

/** Remembers fleet product on shared demo / dual-operator sessions. */
export const FLEET_PRODUCT_COOKIE = 'pavilion_fleet_product'

export function parseCompanyProduct(raw: string | undefined | null): CompanyProduct | null {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'businessrocket' || v === 'br') return 'businessrocket'
  if (v === 'pavilion') return 'pavilion'
  return null
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
  if (opts.override) return opts.override
  if (opts.email) {
    const fromEmail = platformBrandForEmail(opts.email)
    if (fromEmail) return fromEmail
  }
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
    opts?.demo === true ||
    (email ? isPlatformStaffEmail(email) : false)

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
