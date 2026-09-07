import 'server-only'

/**
 * Server-only brand pack resolution (session org + DB).
 * Client-safe helpers live in active-trial.ts.
 */
import {
  activeBrandPackSlugFromEnv,
  brandPackSlugFromCookieHeader,
  isCommonsPlatform,
  isCommonsSurface,
  PAVILION_BRAND_COOKIE,
} from '@/lib/crm/active-trial'
import { trialHostForSlug } from '@/lib/crm/product-host'
import { isDemoInstance } from '@/lib/demo/instance'
import {
  trialPackForSlug,
  vanillaTrialPack,
  type TrialBrand,
  type TrialPack,
} from '@/lib/crm/trial-packs'

type OrgPackRow = {
  brand_pack_slug: string
  slug: string
  name: string
  temp_host: string
}

function packFromOrgRow(row: OrgPackRow): TrialPack {
  const packSlug = (row.brand_pack_slug || '').trim().toLowerCase()
  if (packSlug) {
    const named = trialPackForSlug(packSlug)
    if (named) return named
  }
  if (trialPackForSlug(row.slug)) return trialPackForSlug(row.slug)!
  return vanillaTrialPack({
    slug: row.slug,
    schoolName: row.name,
    host: row.temp_host || trialHostForSlug(row.slug),
  })
}

async function packFromOrgId(orgId: string): Promise<TrialPack | null> {
  const { sql } = await import('@/lib/crm/db')
  const org = await sql<OrgPackRow>(
    `select brand_pack_slug, slug, name, temp_host from organizations where id = $1 limit 1`,
    [orgId],
  )
  const row = org.rows[0]
  return row ? packFromOrgRow(row) : null
}

async function packFromSessionOrg(): Promise<TrialPack | null> {
  const { commonsDbEnabled, sql } = await import('@/lib/crm/db')
  const { getAuth } = await import('@/lib/crm/auth')
  const { isPavilionProductPlatform } = await import('@/lib/crm/platform-env')
  if (!commonsDbEnabled() || !isPavilionProductPlatform()) return null
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
    return packFromOrgId(orgId)
  } catch {
    return null
  }
}

/** Trial vanity Host → org pack (works before login so chrome is not Riverside). */
async function packFromRequestHost(): Promise<TrialPack | null> {
  const { commonsDbEnabled, sql } = await import('@/lib/crm/db')
  const { isPavilionProductPlatform } = await import('@/lib/crm/platform-env')
  const { isSharedProductHost, normalizeProductHost } = await import('@/lib/crm/product-host')
  if (!commonsDbEnabled() || !isPavilionProductPlatform()) return null
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const host = normalizeProductHost(
      h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host')?.trim() || '',
    )
    if (!host || isSharedProductHost(host)) return null
    const found = await sql<OrgPackRow>(
      `select brand_pack_slug, slug, name, temp_host from organizations
       where lower(nullif(trim(temp_host), '')) = $1
          or lower(nullif(trim(custom_domain), '')) = $1
       limit 1`,
      [host],
    )
    const row = found.rows[0]
    return row ? packFromOrgRow(row) : null
  } catch {
    return null
  }
}

/** Prefer cookie on demo (prospect switch), else session/host org pack on trial, else env (demo only). */
export async function getActiveBrandPack(opts?: {
  cookieHeader?: string | null
}): Promise<TrialPack | null> {
  if (!isCommonsSurface()) return null

  const { resolveRequestSurface } = await import('@/lib/crm/product-surface-server')
  const surface = await resolveRequestSurface()

  if (surface === 'demo') {
    let slug = ''
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
    if (slug) {
      const { isDemoPublicBrandSlug } = await import('@/lib/crm/demo-public-brands')
      if (!isDemoPublicBrandSlug(slug)) return null
      return trialPackForSlug(slug)
    }
  } else if (surface === 'trial') {
    const fromOrg = (await packFromSessionOrg()) || (await packFromRequestHost())
    if (fromOrg) return fromOrg
    // Never fall through to Riverside env pack on a private trial host.
    return null
  } else if (isCommonsPlatform() && !isDemoInstance()) {
    const fromOrg = (await packFromSessionOrg()) || (await packFromRequestHost())
    if (fromOrg) return fromOrg
  }

  const envSlug = activeBrandPackSlugFromEnv().toLowerCase()
  return envSlug ? trialPackForSlug(envSlug) : null
}

export async function getActiveBrand(opts?: {
  cookieHeader?: string | null
}): Promise<TrialBrand | null> {
  return (await getActiveBrandPack(opts))?.brand ?? null
}
