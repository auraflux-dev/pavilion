import { commonsDbEnabled, sql } from '@/lib/crm/db'

function orgIdOrThrow(orgId: string | null | undefined): string {
  const id = (orgId || '').trim()
  if (!id) throw new Error('organization_id is required')
  return id
}

export type OrgPlan = 'demo' | 'trial' | 'locked' | 'active'

export type OrgBilling = {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  trialStartedAt: string | null
  trialEndsAt: string | null
  customDomain: string
  tempHost: string
}

const HOLD_DAYS = 30

export function writesAllowed(plan: OrgPlan, trialEndsAt: string | null): boolean {
  if (plan === 'active') return true
  if (plan === 'demo') return false
  if (plan === 'locked') return false
  if (plan === 'trial') {
    if (!trialEndsAt) return true
    return Date.now() < Date.parse(trialEndsAt)
  }
  return false
}

export async function getOrgBilling(orgId: string): Promise<OrgBilling | null> {
  if (!commonsDbEnabled()) return null
  const id = orgIdOrThrow(orgId)
  const found = await sql<{
    id: string
    name: string
    slug: string
    plan: string | null
    trial_started_at: Date | null
    trial_ends_at: Date | null
    custom_domain: string | null
    temp_host: string | null
  }>(
    `select id, name, slug, plan, trial_started_at, trial_ends_at, custom_domain, temp_host
       from organizations where id = $1`,
    [id],
  )
  const row = found.rows[0]
  if (!row) return null
  const plan = (row.plan || 'demo') as OrgPlan
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan,
    trialStartedAt: row.trial_started_at ? row.trial_started_at.toISOString() : null,
    trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
    customDomain: row.custom_domain || '',
    tempHost: row.temp_host || '',
  }
}

export async function assertOrgWritable(orgId: string): Promise<OrgBilling> {
  const org = await getOrgBilling(orgId)
  if (!org) throw new Error('organization_id is required')
  if (!writesAllowed(org.plan, org.trialEndsAt)) {
    const err = new Error('Trial ended. Data stays for 30 days. Subscribe to keep writing.')
    ;(err as Error & { status: number }).status = 402
    throw err
  }
  return org
}

export function holdEndsAt(trialEndsAt: string | null): Date | null {
  if (!trialEndsAt) return null
  const t = Date.parse(trialEndsAt)
  if (!Number.isFinite(t)) return null
  return new Date(t + HOLD_DAYS * 24 * 60 * 60 * 1000)
}

export async function listOrgsForLifecycle(): Promise<OrgBilling[]> {
  if (!commonsDbEnabled()) return []
  const found = await sql<{
    id: string
    name: string
    slug: string
    plan: string | null
    trial_started_at: Date | null
    trial_ends_at: Date | null
    custom_domain: string | null
    temp_host: string | null
  }>(
    `select id, name, slug, plan, trial_started_at, trial_ends_at, custom_domain, temp_host
       from organizations`,
  )
  return found.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: (row.plan || 'demo') as OrgPlan,
    trialStartedAt: row.trial_started_at ? row.trial_started_at.toISOString() : null,
    trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
    customDomain: row.custom_domain || '',
    tempHost: row.temp_host || '',
  }))
}
