/**
 * Platform tenant list/detail for Platform Staff (fleet).
 * No live school PII. Connector flags and plan/host only.
 */
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { connectorMeta } from '@/lib/crm/connectors'
import { listCustomerOrganizations, type CompanyProduct, type PlatformOrgOption } from '@/lib/crm/platform-owners'
import { listOrgsForLifecycle } from '@/lib/crm/org-plan'

export type PlatformTenant = PlatformOrgOption & {
  tempHost: string
  customDomain: string
  brandPackSlug: string
  trialEndsAt: string | null
  squareConnected: boolean
  plaidConnected: boolean
  vipReadonly: boolean
  needsAttention: string[]
}

function isVipReadonly(org: { slug: string; plan: string }): boolean {
  const slug = org.slug.toLowerCase()
  const plan = org.plan.toLowerCase()
  return plan === 'vip' || slug === 'shms' || slug === 'shmspto' || slug.includes('stone-hill')
}

export async function listPlatformTenants(opts?: {
  demo?: boolean
  product?: CompanyProduct
}): Promise<PlatformTenant[]> {
  const orgs = await listCustomerOrganizations({
    demo: opts?.demo,
    product: opts?.product,
    includePlatformHome: false,
  })
  const lifecycle = commonsDbEnabled() ? await listOrgsForLifecycle() : []
  const byId = new Map(lifecycle.map((o) => [o.id, o]))

  const out: PlatformTenant[] = []
  for (const org of orgs) {
    const life = byId.get(org.id)
    let squareConnected = false
    let plaidConnected = false
    if (commonsDbEnabled()) {
      try {
        const meta = await connectorMeta(org.id)
        squareConnected = meta.square
        plaidConnected = meta.plaid
      } catch {
        /* org may lack connectors table row */
      }
    }
    const vipReadonly = isVipReadonly(org)
    const needsAttention: string[] = []
    if (!vipReadonly && org.plan !== 'platform' && !squareConnected) {
      needsAttention.push('Square not connected')
    }
    if (!vipReadonly && (org.plan === 'trial' || org.plan === 'demo') && !org.name.trim()) {
      needsAttention.push('Missing org name')
    }

    out.push({
      ...org,
      tempHost: life?.tempHost || '',
      customDomain: life?.customDomain || '',
      brandPackSlug: '',
      trialEndsAt: life?.trialEndsAt || null,
      squareConnected,
      plaidConnected,
      vipReadonly,
      needsAttention,
    })
  }

  if (commonsDbEnabled()) {
    try {
      const packs = await sql<{ id: string; brand_pack_slug: string | null }>(
        `select id, brand_pack_slug from organizations`,
      )
      const packById = new Map(packs.rows.map((r) => [r.id, r.brand_pack_slug || '']))
      for (const t of out) {
        t.brandPackSlug = packById.get(t.id) || ''
      }
    } catch {
      /* ignore */
    }
  }

  return out
}

export async function getPlatformTenant(
  organizationId: string,
  opts?: { demo?: boolean; product?: CompanyProduct },
): Promise<PlatformTenant | null> {
  const all = await listPlatformTenants(opts)
  return all.find((t) => t.id === organizationId) || null
}

export async function platformFleetAttention(opts?: {
  demo?: boolean
  product?: CompanyProduct
}): Promise<
  { id: string; label: string; organizationId: string; tone: 'warn' | 'info' }[]
> {
  const tenants = await listPlatformTenants(opts)
  const items: { id: string; label: string; organizationId: string; tone: 'warn' | 'info' }[] = []
  for (const t of tenants) {
    if (t.vipReadonly || t.plan === 'platform') continue
    for (const note of t.needsAttention) {
      items.push({
        id: `${t.id}:${note}`,
        label: `${t.name}: ${note}`,
        organizationId: t.id,
        tone: 'warn',
      })
    }
  }
  return items.slice(0, 40)
}
