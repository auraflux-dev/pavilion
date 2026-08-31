import { isPavilionProductPlatform } from '@/lib/crm/platform-env'
import {
  isDemoProductHost,
  isSharedProductHost,
  isTrialVanityHost,
  normalizeProductHost,
  PAVILION_TRIAL_DOMAIN_SUFFIX,
} from '@/lib/crm/product-host'

/** Cookie helpers safe for Edge middleware. No Postgres. */

export function hasBetterAuthCookie(cookieNames: string[]): boolean {
  return cookieNames.some(
    (name) => name.includes('better-auth') && name.includes('session_token'),
  )
}

/**
 * Private trial tenant host (login-gated). On unified deploy, derived from Host.
 * Legacy: COMMONS_PLATFORM without DEMO_INSTANCE on a separate project.
 */
export function isCommonsPlatformHost(host?: string): boolean {
  if (!isPavilionProductPlatform()) return false
  if (host) return isTrialVanityHost(host)
  return process.env.DEMO_INSTANCE !== 'true'
}

export { isSharedProductHost, isTrialVanityHost, normalizeProductHost }

/** Temp trial host like `{slug}.onpavilion.com` (suffix from env). Edge-safe. */
export function isVanityTrialHost(host: string): boolean {
  return isTrialVanityHost(host)
}

export function trialDomainSuffix(): string {
  return PAVILION_TRIAL_DOMAIN_SUFFIX
}

export function isDemoHostForMiddleware(host: string): boolean {
  return isDemoProductHost(host)
}
