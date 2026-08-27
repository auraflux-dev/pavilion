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
import { isDemoInstance } from '@/lib/demo/instance'
import {
  trialPackForSlug,
  vanillaTrialPack,
  type TrialBrand,
  type TrialPack,
} from '@/lib/crm/trial-packs'

async function packFromSessionOrg(): Promise<TrialPack | null> {
  const { commonsDbEnabled, sql } = await import('@/lib/crm/db')
  const { getAuth } = await import('@/lib/crm/auth')
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

export async function getActiveBrand(opts?: {
  cookieHeader?: string | null
}): Promise<TrialBrand | null> {
  return (await getActiveBrandPack(opts))?.brand ?? null
}
