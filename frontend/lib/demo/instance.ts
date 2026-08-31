import { isPavilionProductPlatform } from '@/lib/crm/platform-env'
import {
  demoOriginFromHost,
  isDemoProductHost,
  PAVILION_DEMO_HOST,
} from '@/lib/crm/product-host'

/** Deployment has demo capability (env). Host still selects demo vs trial on unified stacks. */
export function demoDeploymentEnabled(): boolean {
  return (
    process.env.DEMO_INSTANCE === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true'
  )
}

/**
 * True when serving the public Riverside demo surface.
 * Pass host from Request / headers on unified demo+trial deploys.
 */
export function isDemoInstance(host?: string): boolean {
  if (host) return isDemoProductHost(host)
  if (demoDeploymentEnabled() && !isPavilionProductPlatform()) return true
  return false
}

/** Client-safe. Uses hostname on the client; env fallback during SSR build. */
export function isPublicDemoInstance(): boolean {
  if (typeof window !== 'undefined') {
    return isDemoProductHost(window.location.hostname)
  }
  return process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true'
}

const SHMS_SITE = 'https://www.shmspto.org'
const DEMO_SITE = `https://${PAVILION_DEMO_HOST}`
const LEGACY_DEMO_SITE = 'https://commons-pto-demo.vercel.app'
const PLATFORM_SITE = 'https://commons-pto.vercel.app'

/** Canonical public origin. Demo/platform never publish shmspto.org in metadata. */
export function publicSiteUrl(host?: string): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (host && isDemoProductHost(host)) return demoOriginFromHost(host)
  if (isDemoInstance(host)) {
    if (env && !/shmspto\.org/i.test(env)) return env
    const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    if (vercelProd && !/shmspto/i.test(vercelProd)) {
      return `https://${vercelProd}`
    }
    return DEMO_SITE
  }
  if (isPavilionProductPlatform()) {
    if (env && !/shmspto\.org/i.test(env)) return env
    return PLATFORM_SITE
  }
  return env || SHMS_SITE
}

/** @deprecated Use publicSiteUrl(host) with request host on unified deploy. */
export const LEGACY_PUBLIC_DEMO_FALLBACK = LEGACY_DEMO_SITE
