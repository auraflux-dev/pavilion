/**
 * Pavilion product host routing (Edge + Node safe).
 *
 * One deploy serves:
 * - demo.onpavilion.com (public Riverside sample)
 * - {slug}.onpavilion.com (private branded trial)
 *
 * Legacy: commons-pto-demo.vercel.app, *.commons-pto.org
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

const LEGACY_DEMO_HOSTS = new Set([
  'commons-pto-demo.vercel.app',
  'commons-pto.vercel.app',
])

const LEGACY_TRIAL_SUFFIX = 'commons-pto.org'

export type ProductSurface = 'demo' | 'trial' | 'shared' | 'other'

export const PAVILION_SURFACE_HEADER = 'x-pavilion-surface'

export function normalizeProductHost(host: string): string {
  return host.trim().toLowerCase().split(':')[0]
}

/** Marketing apex and shared product hosts are never per-tenant trial vanity. */
export function isSharedProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (h.endsWith('.vercel.app')) return true
  if (LEGACY_DEMO_HOSTS.has(h)) return true
  if (h === 'www.shmspto.org' || h === 'shmspto.org') return true
  if (h === 'www.onpavilion.com' || h === 'onpavilion.com') return true
  if (h === PAVILION_DEMO_HOST) return true
  if (h === PAVILION_TRIAL_DOMAIN_SUFFIX) return true
  return false
}

/** Public always-on demo (Riverside sample, optional review code for staff/parent lanes). */
export function isDemoProductHost(host: string): boolean {
  const h = normalizeProductHost(host)
  if (!h) return false
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
