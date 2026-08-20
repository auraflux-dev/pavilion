/**
 * Resolve the private trial content pack for the signed-in Commons org.
 * Server-only (uses Better Auth session + Postgres).
 */
import { getAuth } from '@/lib/crm/auth'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { trialPackForSlug, type TrialPack } from '@/lib/crm/trial-packs'

export async function loadTrialPackFromHeaders(headerStore: Headers): Promise<TrialPack | null> {
  if (!isCommonsPlatformHost() || !commonsDbEnabled()) return null
  const auth = getAuth()
  if (!auth) return null
  try {
    const session = await auth.api.getSession({ headers: headerStore })
    const userId = session?.user?.id
    if (!userId) return null
    const found = await sql<{ slug: string }>(
      `select o.slug
         from people p
         join organizations o on o.id = p.organization_id
        where p.auth_user_id = $1
        limit 1`,
      [userId],
    )
    const slug = found.rows[0]?.slug || ''
    return trialPackForSlug(slug)
  } catch {
    return null
  }
}
