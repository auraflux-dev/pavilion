/**
 * Pavilion product host routing (Edge + Node safe).
 *
 * One deploy serves:
 * - www.onpavilion.com / onpavilion.com (Pavilion brand: marketing + /staff)
 * - www.businessrocket.ai / businessrocket.ai (BR brand: marketing + /staff, no member portal)
 * - demo.onpavilion.com (public Riverside sample)
 * - {slug}.onpavilion.com / {slug}.businessrocket.ai (private branded trial)
 *
 * Legacy: commons-pto-demo.vercel.app, *.commons-pto.org
 * Reserved: staff.* is never a trial slug (not a product host).
 */

export const PAVILION_TRIAL_DOMAIN_SUFFIX = (
  process.env.PAVILION_TRIAL_DOMAIN_SUFFIX ||
  process.env.COMMONS_TEMP_DOMAIN_SUFFIX ||
  'onpavilion.com'
)
  .replace(/^\./, '')
  .toLowerCase()

/** Business Rocket customer vanity hosts ({slug}.businessrocket.ai). */
export const BR_TRIAL_DOMAIN_SUFFIX = (
  process.env.BR_TRIAL_DOMAIN_SUFFIX ||
  process.env.BUSINESSROCKET_TRIAL_DOMAIN_SUFFIX ||
  'businessrocket.ai'
)
  .replace(/^\./, '')
  .toLowerCase()

export const PAVILION_DEMO_HOST = (
  process.env.PAVILION_DEMO_HOST || 'demo.onpavilion.com'
)
  .trim()
  .toLowerCase()

/** Pavilion company brand site (marketing + Platform Staff at /staff). */
export const PAVILION_BRAND_HOST = (
  process.env.PAVILION_BRAND_HOST ||
  process.env.NEXT_PUBLIC_PAVILION_BRAND_HOST ||
  'www.onpavilion.com'
)
  .trim()
  .toLowerCase()

/** Business Rocket company brand site (marketing + BR Platform Staff at /staff). */
export const BR_BRAND_HOST = (
  process.env.BR_BRAND_HOST ||
  process.env.NEXT_PUBLIC_BR_BRAND_HOST ||
  'www.businessrocket.ai'
)
  .trim()
  .toLowerCase()

const LEGACY_DEMO_HOSTS = new Set([
  'commons-pto-demo.vercel.app',
  'commons-pto.vercel.app',
])

const LEGACY_TRIAL_SUFFIX = 'commons-pto.org'

/** Reserved first labels under the trial suffix. Never treat as trial vanity. */
const RESERVED_TRIAL_LABELS = new Set(['demo', 'staff', 'www', 'mail', 'api'])

export type ProductSurface = 'brand' | 'demo' | 'trial' | 'shared' | 'other'

export const PAVILION_SURFACE_HEADER = 'x-pavilion-surface'

export function normalizeProductHost(host: string): string {
  return host.trim().toLowerCase().split(':')[0]
}

/** Pavilion company marketing + Platform Staff path (/staff). No staff subdomain. */
export function isPavilionBrandHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  if (h === PAVILION_BRAND_HOST) return true
  if (h === 'www.onpavilion.com' || h === 'onpavilion.com') return true
  if (h === `www.${PAVILION_TRIAL_DOMAIN_SUFFIX}` || h === PAVILION_TRIAL_DOMAIN_SUFFIX) {
    return true
  }
  return false
}

/** Business Rocket company marketing + Platform Staff path (/staff). No member portal. */
export function isBusinessRocketBrandHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  if (h === BR_BRAND_HOST) return true
  if (h === 'www.businessrocket.ai' || h === 'businessrocket.ai') return true
  if (h === `www.${BR_TRIAL_DOMAIN_SUFFIX}` || h === BR_TRIAL_DOMAIN_SUFFIX) {
    return true
  }
  return false
}

/** Either company brand surface (Pavilion or Business Rocket). */
export function isCompanyBrandHost(host: string): boolean {
  return isPavilionBrandHost(host) || isBusinessRocketBrandHost(host)
}

/** Which company brand owns this host (for Staff copy + fleet filter). */
export function companyBrandFromHost(host: string): 'pavilion' | 'businessrocket' | null {
  if (isBusinessRocketBrandHost(host)) return 'businessrocket'
  if (isPavilionBrandHost(host)) return 'pavilion'
  return null
}

/** Canonical origin for Pavilion brand (marketing + /staff). */
export function pavilionBrandOrigin(): string {
  const host = PAVILION_BRAND_HOST.startsWith('www.')
    ? PAVILION_BRAND_HOST
    : `www.${PAVILION_TRIAL_DOMAIN_SUFFIX}`
  return `https://${host}`
}

/** Canonical origin for Business Rocket brand (marketing + /staff). */
export function businessRocketBrandOrigin(): string {
  const host = BR_BRAND_HOST.startsWith('www.')
    ? BR_BRAND_HOST
    : `www.${BR_TRIAL_DOMAIN_SUFFIX}`
  return `https://${host}`
}

/** Brand Staff origin for the given host (falls back to Pavilion). */
export function companyBrandOrigin(host?: string): string {
  if (host && isBusinessRocketBrandHost(host)) return businessRocketBrandOrigin()
  return pavilionBrandOrigin()
}

/** @deprecated Use pavilionBrandOrigin. Staff is a path on the brand site. */
export function platformStaffOrigin(): string {
  return pavilionBrandOrigin()
}

/** Reserved host labels (e.g. staff.*) must never become trial orgs. */
export function isReservedProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  for (const suffix of [PAVILION_TRIAL_DOMAIN_SUFFIX, BR_TRIAL_DOMAIN_SUFFIX]) {
    if (!h.endsWith(`.${suffix}`)) continue
    const label = h.slice(0, -(suffix.length + 1))
    if (RESERVED_TRIAL_LABELS.has(label)) return true
  }
  return false
}

/** @deprecated Prefer isCompanyBrandHost. Kept for call-site migration. */
export function isPlatformStaffHost(host: string): boolean {
  return isCompanyBrandHost(host) || isReservedProductHost(host)
}

/** Marketing apex and shared product hosts are never per-tenant trial vanity. */
export function isSharedProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (h.endsWith('.vercel.app')) return true
  if (LEGACY_DEMO_HOSTS.has(h)) return true
  if (h === 'www.shmspto.org' || h === 'shmspto.org') return true
  if (isCompanyBrandHost(h)) return true
  if (h === PAVILION_DEMO_HOST) return true
  if (isReservedProductHost(h)) return true
  if (h === PAVILION_TRIAL_DOMAIN_SUFFIX) return true
  if (h === BR_TRIAL_DOMAIN_SUFFIX || h === `www.${BR_TRIAL_DOMAIN_SUFFIX}`) return true
  return false
}

/** Public always-on demo (Riverside sample, optional review code for staff/parent lanes). */
export function isDemoProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  if (isCompanyBrandHost(h)) return false
  if (h === PAVILION_DEMO_HOST) return true
  if (LEGACY_DEMO_HOSTS.has(h)) return true
  if (h === 'localhost' || h === '127.0.0.1') {
    return (
      process.env.DEMO_INSTANCE === 'true' ||
      process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true'
    )
  }
  return false
}

function isVanityUnderSuffix(host: string, suffix: string): boolean {
  if (!host.endsWith(`.${suffix}`)) return false
  if (host === suffix || host === `www.${suffix}` || host === `demo.${suffix}`) return false
  const label = host.slice(0, -(suffix.length + 1))
  if (!label || label.includes('.')) return false
  if (RESERVED_TRIAL_LABELS.has(label)) return false
  return true
}

/** Private branded trial vanity host ({slug}.onpavilion.com, {slug}.businessrocket.ai, legacy). */
export function isTrialVanityHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h || isSharedProductHost(h)) return false

  if (isVanityUnderSuffix(h, PAVILION_TRIAL_DOMAIN_SUFFIX) && h !== PAVILION_DEMO_HOST) {
    return true
  }

  if (isVanityUnderSuffix(h, BR_TRIAL_DOMAIN_SUFFIX)) {
    return true
  }

  if (h.endsWith(`.${LEGACY_TRIAL_SUFFIX}`) || h === LEGACY_TRIAL_SUFFIX) {
    return true
  }

  return false
}

export function productSurfaceFromHost(host: string): ProductSurface {
  if (isCompanyBrandHost(host)) return 'brand'
  if (isDemoProductHost(host)) return 'demo'
  if (isTrialVanityHost(host)) return 'trial'
  if (isSharedProductHost(host)) return 'shared'
  return 'other'
}

export function demoOriginFromHost(host: string): string {
  if (isDemoProductHost(host)) {
    const h = normalizeProductHost(host)
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000'
    return `https://${h}`
  }
  return `https://${PAVILION_DEMO_HOST}`
}

export function trialDomainSuffixForProduct(
  product: 'pavilion' | 'businessrocket' = 'pavilion',
): string {
  if (product === 'businessrocket') return BR_TRIAL_DOMAIN_SUFFIX
  return PAVILION_TRIAL_DOMAIN_SUFFIX
}

export function trialHostForSlug(
  slug: string,
  product: 'pavilion' | 'businessrocket' = 'pavilion',
): string {
  const clean = slug.trim().toLowerCase()
  return `${clean}.${trialDomainSuffixForProduct(product)}`
}
