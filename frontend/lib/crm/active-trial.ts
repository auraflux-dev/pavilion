/**
 * Commons brand packs (prospect PTO skin) on the demo app.
 *
 * One ship target: commons-pto-demo. Brand a prospect with a pack.
 * "Trial" means they like it and unlock private/live connectors later.
 * Separate commons-pto host is legacy until retired.
 */
import { trialPackForSlug, type TrialBrand, type TrialPack } from '@/lib/crm/trial-packs'
import { isDemoInstance } from '@/lib/demo/instance'

export const PAVILION_BRAND_COOKIE = 'pavilion_brand'

export function isCommonsPlatform(): boolean {
  return (
    process.env.COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'
  )
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

/** Prefer cookie on demo (prospect switch), else env. */
export async function getActiveBrandPack(opts?: {
  cookieHeader?: string | null
}): Promise<TrialPack | null> {
  if (!isCommonsSurface()) return null

  let slug = ''
  if (isDemoInstance()) {
    if (opts?.cookieHeader !== undefined) {
      slug = brandPackSlugFromCookieHeader(opts.cookieHeader)
    } else {
      try {
        const { cookies } = await import('next/headers')
        const jar = await cookies()
        slug = (jar.get(PAVILION_BRAND_COOKIE)?.value || '').trim().toLowerCase()
      } catch {
        slug = ''
      }
    }
  }
  if (!slug) slug = activeBrandPackSlugFromEnv().toLowerCase()
  return slug ? trialPackForSlug(slug) : null
}

export function getActiveTrialBrand(): TrialBrand | null {
  return getActiveTrialPack()?.brand ?? null
}

export async function getActiveBrand(opts?: {
  cookieHeader?: string | null
}): Promise<TrialBrand | null> {
  return (await getActiveBrandPack(opts))?.brand ?? null
}
