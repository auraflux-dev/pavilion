/**
 * Pavilion platform owners — overarching CMS admins (@onpavilion.com).
 * Customer staff stay per-org; platform owners can switch org and edit any customer CMS.
 */
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { isDemoInstance } from '@/lib/demo/instance'

export const PLATFORM_STAFF_EMAIL_DOMAIN = 'onpavilion.com'
export const PLATFORM_OWNER_PRIMARY_EMAIL = `robert@${PLATFORM_STAFF_EMAIL_DOMAIN}`
/** Cookie: which customer org a platform owner is editing CMS for. */
export const PLATFORM_CMS_ORG_COOKIE = 'pavilion_cms_org'

export const PLATFORM_OWNERS_SQL = `
create table if not exists platform_owners (
  email       text primary key,
  name        text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
`

export function isPlatformStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${PLATFORM_STAFF_EMAIL_DOMAIN}`)
}

export async function isPlatformOwnerEmail(
  email: string,
  opts?: { demo?: boolean },
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  const demo = opts?.demo ?? isDemoInstance()
  if (demo && (normalized === PLATFORM_OWNER_PRIMARY_EMAIL || normalized.endsWith('@onpavilion.com'))) {
    return true
  }
  if (!commonsDbEnabled()) {
    return isPlatformStaffEmail(normalized)
  }
  try {
    const found = await sql<{ email: string }>(
      `select email from platform_owners where email = $1 and active = true limit 1`,
      [normalized],
    )
    if (found.rows[0]) return true
  } catch {
    // table may not exist yet mid-migrate
  }
  // @onpavilion.com is the platform staff domain even before a row exists
  return isPlatformStaffEmail(normalized)
}

export async function ensurePlatformOwnerSeed(): Promise<void> {
  if (!commonsDbEnabled()) return
  await sql(PLATFORM_OWNERS_SQL)
  await sql(
    `insert into platform_owners (email, name, active)
     values ($1, 'Robert Gregory', true)
     on conflict (email) do update set name = excluded.name, active = true`,
    [PLATFORM_OWNER_PRIMARY_EMAIL],
  )
  // Pavilion product org (platform home CMS)
  await sql(
    `insert into organizations (id, name, slug, plan)
     values ('org_pavilion', 'Pavilion', 'pavilion', 'platform')
     on conflict (id) do update set name = excluded.name, slug = excluded.slug`,
  )
  await sql(
    `insert into people (id, organization_id, email, first_name, last_name)
     values ('p_robert_pavilion', 'org_pavilion', $1, 'Robert', 'Gregory')
     on conflict (id) do update set email = excluded.email, organization_id = excluded.organization_id`,
    [PLATFORM_OWNER_PRIMARY_EMAIL],
  )
  await sql(
    `insert into staff_assignments (person_id, role, board_title, organization_id)
     values ('p_robert_pavilion', 'admin', 'Pavilion platform owner', 'org_pavilion')
     on conflict (person_id, role) do update set
       board_title = excluded.board_title,
       organization_id = excluded.organization_id`,
  )
}

export type PlatformOrgOption = {
  id: string
  name: string
  slug: string
  plan: string
}

export async function listCustomerOrganizations(opts?: {
  demo?: boolean
}): Promise<PlatformOrgOption[]> {
  const demo = opts?.demo ?? isDemoInstance()
  if (!commonsDbEnabled()) {
    if (demo) {
      return [
        { id: 'org_riverside', name: 'Riverside Elementary PTO', slug: 'riverside', plan: 'demo' },
        { id: 'org_pavilion', name: 'Pavilion', slug: 'pavilion', plan: 'platform' },
      ]
    }
    return []
  }
  await ensurePlatformOwnerSeed()
  const found = await sql<{ id: string; name: string; slug: string; plan: string | null }>(
    `select id, name, slug, coalesce(plan, '') as plan
       from organizations
      order by case when id = 'org_pavilion' then 0 else 1 end, name asc
      limit 200`,
  )
  return found.rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    plan: r.plan || 'demo',
  }))
}

export function readPlatformCmsOrgCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === PLATFORM_CMS_ORG_COOKIE) {
      const v = decodeURIComponent(rest.join('=')).trim()
      return v || null
    }
  }
  return null
}
