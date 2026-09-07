/**
 * Pavilion product host routing (Edge + Node safe).
 *
 * One deploy serves:
 * - www.onpavilion.com / onpavilion.com (Pavilion brand: marketing + /staff)
 * - demo.onpavilion.com (public Riverside sample)
 * - {slug}.onpavilion.com (private branded trial)
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

/** Canonical origin for Pavilion brand (marketing + /staff). */
export function pavilionBrandOrigin(): string {
  const host = PAVILION_BRAND_HOST.startsWith('www.')
    ? PAVILION_BRAND_HOST
    : `www.${PAVILION_TRIAL_DOMAIN_SUFFIX}`
  return `https://${host}`
}

/** @deprecated Use pavilionBrandOrigin. Staff is a path on the brand site. */
export function platformStaffOrigin(): string {
  return pavilionBrandOrigin()
}

/** Reserved host labels (e.g. staff.*) must never become trial orgs. */
export function isReservedProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  const suffix = PAVILION_TRIAL_DOMAIN_SUFFIX
  if (!h.endsWith(`.${suffix}`)) return false
  const label = h.slice(0, -(suffix.length + 1))
  return RESERVED_TRIAL_LABELS.has(label)
}

/** @deprecated Prefer isPavilionBrandHost. Kept for call-site migration. */
export function isPlatformStaffHost(host: string): boolean {
  return isPavilionBrandHost(host) || isReservedProductHost(host)
}

/** Marketing apex and shared product hosts are never per-tenant trial vanity. */
export function isSharedProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (h.endsWith('.vercel.app')) return true
  if (LEGACY_DEMO_HOSTS.has(h)) return true
  if (h === 'www.shmspto.org' || h === 'shmspto.org') return true
  if (isPavilionBrandHost(h)) return true
  if (h === PAVILION_DEMO_HOST) return true
  if (isReservedProductHost(h)) return true
  if (h === PAVILION_TRIAL_DOMAIN_SUFFIX) return true
  return false
}

/** Public always-on demo (Riverside sample, optional review code for staff/parent lanes). */
export function isDemoProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
  if (isPavilionBrandHost(h)) return false
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

/** Private branded trial vanity host ({slug}.onpavilion.com or legacy *.commons-pto.org). */
export function isTrialVanityHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h || isSharedProductHost(h)) return false

  const suffix = PAVILION_TRIAL_DOMAIN_SUFFIX
  if (h.endsWith(`.${suffix}`) && h !== `demo.${suffix}` && h !== PAVILION_DEMO_HOST) {
    return true
  }

  if (h.endsWith(`.${LEGACY_TRIAL_SUFFIX}`) || h === LEGACY_TRIAL_SUFFIX) {
    return true
  }

  return false
}

export function productSurfaceFromHost(host: string): ProductSurface {
  if (isPavilionBrandHost(host)) return 'brand'
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

export function trialHostForSlug(slug: string): string {
  const clean = slug.trim().toLowerCase()
  return `${clean}.${PAVILION_TRIAL_DOMAIN_SUFFIX}`
}
