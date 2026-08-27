/**
 * Pavilion brand packs — client-safe helpers (env / cookie parse).
 * Session/DB resolution: `@/lib/crm/active-trial-server` (server-only).
 */
import {
  trialPackForSlug,
  type TrialBrand,
  type TrialPack,
} from '@/lib/crm/trial-packs'
import { isDemoInstance } from '@/lib/demo/instance'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

export const PAVILION_BRAND_COOKIE = 'pavilion_brand'

export function isCommonsPlatform(): boolean {
  return isPavilionProductPlatform()
}

/** Demo or legacy platform host. Shared product surface. */
export function isCommonsSurface(): boolean {
  return isDemoInstance() || isCommonsPlatform()
}

export function activeBrandPackSlugFromEnv(): string {
  return (
    process.env.COMMONS_BRAND_PACK ||
    process.env.NEXT_PUBLIC_COMMONS_BRAND_PACK ||
    process.env.COMMONS_TRIAL_PACK ||
    process.env.NEXT_PUBLIC_COMMONS_TRIAL_PACK ||
    ''
  ).trim()
}

/** @deprecated Use activeBrandPackSlugFromEnv */
export function activeTrialPackSlug(): string {
  return activeBrandPackSlugFromEnv()
}

function slugFromCookieHeader(cookieHeader: string | null | undefined): string {
  if (!cookieHeader) return ''
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=')
    if (rawName === PAVILION_BRAND_COOKIE) {
      return decodeURIComponent(rest.join('=').trim())
    }
  }
  return ''
}

export function brandPackSlugFromCookieHeader(cookieHeader?: string | null): string {
  return slugFromCookieHeader(cookieHeader).toLowerCase()
}

/** Sync resolve (env only). Fine for build metadata and client builds with NEXT_PUBLIC_*. */
export function getActiveTrialPack(): TrialPack | null {
  if (!isCommonsSurface()) return null
  const slug = activeBrandPackSlugFromEnv()
  return slug ? trialPackForSlug(slug) : null
}

export function getActiveTrialBrand(): TrialBrand | null {
  return getActiveTrialPack()?.brand ?? null
}
