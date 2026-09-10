/**
 * Resolve which company product's fleet a Platform Staff request should see.
 * Host wins (BR brand host → businessrocket); else email domain; else pavilion.
 */
import { companyBrandFromHost } from '@/lib/crm/product-host'
import {
  platformBrandForEmail,
  platformHomeOrgId,
  type CompanyProduct,
} from '@/lib/crm/platform-owners'
import { hostFromRequest } from '@/lib/demo/instance'

export function resolveFleetProduct(opts: {
  host?: string
  email?: string
}): CompanyProduct {
  if (opts.host) {
    const fromHost = companyBrandFromHost(opts.host)
    if (fromHost) return fromHost
  }
  if (opts.email) {
    const fromEmail = platformBrandForEmail(opts.email)
    if (fromEmail) return fromEmail
  }
  return 'pavilion'
}

export function resolveFleetProductFromRequest(
  req: { headers: { get(name: string): string | null } },
  email?: string,
): CompanyProduct {
  return resolveFleetProduct({ host: hostFromRequest(req), email })
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
