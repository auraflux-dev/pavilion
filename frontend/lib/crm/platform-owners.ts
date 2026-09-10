/**
 * Platform owners — overarching CMS admins for company Staff.
 * Pavilion: @onpavilion.com · Business Rocket: @businessrocket.ai · AuraFlux: @auraflux.co
 * Customer staff stay per-org; platform owners can switch org and warp into client Staff.
 *
 * Brand Staff is Platform Staff on the company host — never a dressed-up customer org.
 */
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { isDemoInstance } from '@/lib/demo/instance'

export const PLATFORM_STAFF_EMAIL_DOMAIN = 'onpavilion.com'
export const BR_PLATFORM_STAFF_EMAIL_DOMAIN = 'businessrocket.ai'
export const AF_PLATFORM_STAFF_EMAIL_DOMAIN = 'auraflux.co'
export const PLATFORM_OWNER_PRIMARY_EMAIL = `robert@${PLATFORM_STAFF_EMAIL_DOMAIN}`
export const BR_PLATFORM_OWNER_PRIMARY_EMAIL = `robert@${BR_PLATFORM_STAFF_EMAIL_DOMAIN}`
export const AF_PLATFORM_OWNER_PRIMARY_EMAIL = `robert@${AF_PLATFORM_STAFF_EMAIL_DOMAIN}`
/** Cookie: which customer org a platform owner is editing CMS for. */
export const PLATFORM_CMS_ORG_COOKIE = 'pavilion_cms_org'

export type CompanyProduct = 'pavilion' | 'businessrocket' | 'auraflux'

export function normalizeCompanyProduct(raw: string | null | undefined): CompanyProduct {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'businessrocket' || v === 'br') return 'businessrocket'
  if (v === 'auraflux' || v === 'af') return 'auraflux'
  return 'pavilion'
}

export const PLATFORM_OWNERS_SQL = `
create table if not exists platform_owners (
  email       text primary key,
  name        text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
`

export function isPlatformStaffEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return (
    normalized.endsWith(`@${PLATFORM_STAFF_EMAIL_DOMAIN}`) ||
    normalized.endsWith(`@${BR_PLATFORM_STAFF_EMAIL_DOMAIN}`) ||
    normalized.endsWith(`@${AF_PLATFORM_STAFF_EMAIL_DOMAIN}`)
  )
}

export function platformBrandForEmail(email: string): CompanyProduct | null {
  const normalized = email.trim().toLowerCase()
  if (normalized.endsWith(`@${BR_PLATFORM_STAFF_EMAIL_DOMAIN}`)) return 'businessrocket'
  if (normalized.endsWith(`@${AF_PLATFORM_STAFF_EMAIL_DOMAIN}`)) return 'auraflux'
  if (normalized.endsWith(`@${PLATFORM_STAFF_EMAIL_DOMAIN}`)) return 'pavilion'
  return null
}

/** Platform home org id for company Staff CMS (not a customer). */
export function platformHomeOrgId(product: CompanyProduct): string {
  if (product === 'businessrocket') return 'org_businessrocket'
  if (product === 'auraflux') return 'org_auraflux'
  return 'org_pavilion'
}

export async function isPlatformOwnerEmail(
  email: string,
  opts?: { demo?: boolean },
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  const demo = opts?.demo ?? isDemoInstance()
  if (
    demo &&
    (normalized === PLATFORM_OWNER_PRIMARY_EMAIL ||
      normalized === BR_PLATFORM_OWNER_PRIMARY_EMAIL ||
      normalized === AF_PLATFORM_OWNER_PRIMARY_EMAIL ||
      isPlatformStaffEmail(normalized))
  ) {
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
  // Company staff domains are platform owners even before a row exists
  return isPlatformStaffEmail(normalized)
}

export async function ensurePlatformOwnerSeed(): Promise<void> {
  if (!commonsDbEnabled()) return
  await sql(PLATFORM_OWNERS_SQL)
  await sql(`alter table organizations add column if not exists product text not null default 'pavilion'`)

  for (const [email, name] of [
    [PLATFORM_OWNER_PRIMARY_EMAIL, 'Robert Gregory'],
    [BR_PLATFORM_OWNER_PRIMARY_EMAIL, 'Robert Gregory'],
    [AF_PLATFORM_OWNER_PRIMARY_EMAIL, 'Robert Gregory'],
  ] as const) {
    await sql(
      `insert into platform_owners (email, name, active)
       values ($1, $2, true)
       on conflict (email) do update set name = excluded.name, active = true`,
      [email, name],
    )
  }

  // Pavilion product org (platform home CMS — not a customer)
  await sql(
    `insert into organizations (id, name, slug, plan, product)
     values ('org_pavilion', 'Pavilion', 'pavilion', 'platform', 'pavilion')
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       plan = excluded.plan,
       product = excluded.product`,
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

  // Business Rocket company org (platform home CMS — not a dressed-up customer)
  await sql(
    `insert into organizations (id, name, slug, plan, product)
     values ('org_businessrocket', 'Business Rocket', 'businessrocket', 'platform', 'businessrocket')
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       plan = excluded.plan,
       product = excluded.product`,
  )
  await sql(
    `insert into people (id, organization_id, email, first_name, last_name)
     values ('p_robert_br', 'org_businessrocket', $1, 'Robert', 'Gregory')
     on conflict (id) do update set email = excluded.email, organization_id = excluded.organization_id`,
    [BR_PLATFORM_OWNER_PRIMARY_EMAIL],
  )
  await sql(
    `insert into staff_assignments (person_id, role, board_title, organization_id)
     values ('p_robert_br', 'admin', 'Business Rocket platform owner', 'org_businessrocket')
     on conflict (person_id, role) do update set
       board_title = excluded.board_title,
       organization_id = excluded.organization_id`,
  )

  // Demo BR customer sandbox (fleet list; not platform home)
  await sql(
    `insert into organizations (id, name, slug, plan, product)
     values ('org_hskrg_br', 'HSKRG BR sandbox', 'hskrg-br', 'trial', 'businessrocket')
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       plan = excluded.plan,
       product = excluded.product`,
  )

  // AuraFlux company org (platform home — Brand Staff + brand member portal)
  await sql(
    `insert into organizations (id, name, slug, plan, product)
     values ('org_auraflux', 'AuraFlux', 'auraflux', 'platform', 'auraflux')
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       plan = excluded.plan,
       product = excluded.product`,
  )
  await sql(
    `insert into people (id, organization_id, email, first_name, last_name)
     values ('p_robert_af', 'org_auraflux', $1, 'Robert', 'Gregory')
     on conflict (id) do update set email = excluded.email, organization_id = excluded.organization_id`,
    [AF_PLATFORM_OWNER_PRIMARY_EMAIL],
  )
  await sql(
    `insert into staff_assignments (person_id, role, board_title, organization_id)
     values ('p_robert_af', 'admin', 'AuraFlux Brand Staff', 'org_auraflux')
     on conflict (person_id, role) do update set
       board_title = excluded.board_title,
       organization_id = excluded.organization_id`,
  )

  // Demo AF customer sandbox
  await sql(
    `insert into organizations (id, name, slug, plan, product)
     values ('org_af_sandbox', 'AuraFlux sandbox', 'af-sandbox', 'trial', 'auraflux')
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       plan = excluded.plan,
       product = excluded.product`,
  )
}

export type PlatformOrgOption = {
  id: string
  name: string
  slug: string
  plan: string
  product: CompanyProduct
}

export async function listCustomerOrganizations(opts?: {
  demo?: boolean
  /** When set, only orgs for that company product (brand Staff fleet). */
  product?: CompanyProduct
  /** Include platform home orgs (plan=platform). Default false for fleet warp lists. */
  includePlatformHome?: boolean
}): Promise<PlatformOrgOption[]> {
  const demo = opts?.demo ?? isDemoInstance()
  const product = opts?.product
  const includePlatformHome = opts?.includePlatformHome === true

  if (!commonsDbEnabled()) {
    if (demo) {
      const demoOrgs: PlatformOrgOption[] = [
        {
          id: 'org_riverside',
          name: 'Riverside Elementary PTO',
          slug: 'riverside',
          plan: 'demo',
          product: 'pavilion',
        },
        {
          id: 'org_pavilion',
          name: 'Pavilion',
          slug: 'pavilion',
          plan: 'platform',
          product: 'pavilion',
        },
        {
          id: 'org_hskrg_br',
          name: 'HSKRG BR sandbox',
          slug: 'hskrg-br',
          plan: 'trial',
          product: 'businessrocket',
        },
        {
          id: 'org_businessrocket',
          name: 'Business Rocket',
          slug: 'businessrocket',
          plan: 'platform',
          product: 'businessrocket',
        },
        {
          id: 'org_af_sandbox',
          name: 'AuraFlux sandbox',
          slug: 'af-sandbox',
          plan: 'trial',
          product: 'auraflux',
        },
        {
          id: 'org_auraflux',
          name: 'AuraFlux',
          slug: 'auraflux',
          plan: 'platform',
          product: 'auraflux',
        },
      ]
      return demoOrgs.filter((o) => {
        if (product && o.product !== product) return false
        if (!includePlatformHome && o.plan === 'platform') return false
        return true
      })
    }
    return []
  }

  await ensurePlatformOwnerSeed()
  const found = await sql<{
    id: string
    name: string
    slug: string
    plan: string | null
    product: string | null
  }>(
    `select id, name, slug, coalesce(plan, '') as plan, coalesce(product, 'pavilion') as product
       from organizations
      order by
        case when id in ('org_pavilion', 'org_businessrocket', 'org_auraflux') then 0 else 1 end,
        name asc
      limit 200`,
  )

  return found.rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan || 'demo',
      product: normalizeCompanyProduct(r.product),
    }))
    .filter((o) => {
      if (product && o.product !== product) return false
      if (!includePlatformHome && o.plan === 'platform') return false
      return true
    })
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
