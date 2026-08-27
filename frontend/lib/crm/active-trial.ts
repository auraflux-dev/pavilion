/**
 * Pavilion brand packs (prospect PTO skin) on the demo app + trial tenants.
 *
 * One ship target: commons-pto-demo (legacy name). Brand a prospect with a pack.
 * "Trial" means they like it and unlock private/live connectors later.
 * Separate commons-pto host is legacy until retired.
 */
import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import {
  trialPackForSlug,
  vanillaTrialPack,
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

async function packFromSessionOrg(): Promise<TrialPack | null> {
  if (!commonsDbEnabled() || !isCommonsPlatform()) return null
  const auth = getAuth()
  if (!auth) return null
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const session = await auth.api.getSession({ headers: h })
    const userId = session?.user?.id
    if (!userId) return null
    const person = await sql<{ organization_id: string }>(
      `select organization_id from people where auth_user_id = $1 limit 1`,
      [userId],
    )
    const orgId = person.rows[0]?.organization_id?.trim()
    if (!orgId) return null
    const org = await sql<{
      brand_pack_slug: string
      slug: string
      name: string
      temp_host: string
    }>(
      `select brand_pack_slug, slug, name, temp_host from organizations where id = $1 limit 1`,
      [orgId],
    )
    const row = org.rows[0]
    if (!row) return null
    const packSlug = (row.brand_pack_slug || '').trim().toLowerCase()
    if (packSlug) {
      const named = trialPackForSlug(packSlug)
      if (named) return named
    }
    if (trialPackForSlug(row.slug)) return trialPackForSlug(row.slug)
    return vanillaTrialPack({
      slug: row.slug,
      schoolName: row.name,
      host: row.temp_host || `${row.slug}.commons-pto.org`,
    })
  } catch {
    return null
  }
}

/** Prefer cookie on demo (prospect switch), else session org pack on platform, else env. */
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
    if (slug) return trialPackForSlug(slug)
  } else if (isCommonsPlatform()) {
    const fromOrg = await packFromSessionOrg()
    if (fromOrg) return fromOrg
  }

  slug = activeBrandPackSlugFromEnv().toLowerCase()
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
