import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

/** Cookie helpers safe for Edge middleware. No Postgres. */

export function hasBetterAuthCookie(cookieNames: string[]): boolean {
  return cookieNames.some(
    (name) => name.includes('better-auth') && name.includes('session_token'),
  )
}

export function isCommonsPlatformHost(): boolean {
  return isPavilionProductPlatform() && process.env.DEMO_INSTANCE !== 'true'
}

/** Shared product / apex hosts are not per-tenant vanity hosts. Edge-safe. */
export function isSharedProductHost(host: string): boolean {
  const h = host.trim().toLowerCase().split(':')[0]
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (h.endsWith('.vercel.app')) return true
  if (h === 'commons-pto-demo.vercel.app' || h === 'commons-pto.vercel.app') return true
  if (h === 'www.shmspto.org' || h === 'shmspto.org') return true
  if (h === 'www.onpavilion.com' || h === 'onpavilion.com') return true
  return false
}

/** Temp trial host like `{slug}.commons-pto.org` (suffix from env). Edge-safe. */
export function isVanityTrialHost(host: string): boolean {
  const h = host.trim().toLowerCase().split(':')[0]
  if (!h || isSharedProductHost(h)) return false
  const suffix = (process.env.COMMONS_TEMP_DOMAIN_SUFFIX || 'commons-pto.org')
    .replace(/^\./, '')
    .toLowerCase()
  return h === suffix || h.endsWith(`.${suffix}`)
}
