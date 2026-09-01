import type { PoolClient, QueryResult, QueryResultRow } from 'pg'
import { getAuth } from '@/lib/crm/auth'
import { isSharedProductHost } from '@/lib/crm/auth-edge'
import { commonsDbEnabled, getPool, sql } from '@/lib/crm/db'
import { assertOrgWritable, type OrgPlan } from '@/lib/crm/org-plan'
import { isDemoInstanceFromRequest } from '@/lib/demo/instance'
import { riversideSnapshot } from '@/lib/crm/riverside'

export class MissingOrganizationIdError extends Error {
  constructor() {
    super('organization_id is required')
    this.name = 'MissingOrganizationIdError'
  }
}

export function requireOrganizationId(orgId: string | null | undefined): string {
  const id = (orgId || '').trim()
  if (!id) throw new MissingOrganizationIdError()
  return id
}

export async function organizationIdFromRequest(req: Request): Promise<string> {
  if (!commonsDbEnabled()) {
    if (isDemoInstanceFromRequest(req)) return requireOrganizationId(riversideSnapshot().organization.id)
    throw new MissingOrganizationIdError()
  }

  const auth = getAuth()
  if (auth) {
    const session = await auth.api.getSession({ headers: req.headers })
    const userId = session?.user?.id
    if (userId) {
      const found = await sql<{ organization_id: string }>(
        `select organization_id from people where auth_user_id = $1 limit 1`,
        [userId],
      )
      if (found.rows[0]?.organization_id) {
        return requireOrganizationId(found.rows[0].organization_id)
      }
    }
  }

  const fromHost = await organizationIdFromHostHeader(req)
  if (fromHost) return requireOrganizationId(fromHost)

  if (isDemoInstanceFromRequest(req)) return requireOrganizationId(riversideSnapshot().organization.id)
  throw new MissingOrganizationIdError()
}

/** Normalize request Host / x-forwarded-host (no port). */
export function normalizeRequestHost(req: Request): string {
  const raw =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host')?.trim() ||
    ''
  return raw.split(':')[0].trim().toLowerCase()
}

export type HostTenantRow = {
  id: string
  plan: OrgPlan
  trialEndsAt: string | null
}

/**
 * Resolve tenant from Host matching organizations.temp_host or custom_domain.
 * Session still wins when present. Used for trial vanity hosts on the shared stack.
 */
export async function organizationFromHostHeader(req: Request): Promise<HostTenantRow | null> {
  if (!commonsDbEnabled()) return null
  const host = normalizeRequestHost(req)
  if (!host || isSharedProductHost(host)) return null
  try {
    const found = await sql<{
      id: string
      plan: string | null
      trial_ends_at: Date | null
    }>(
      `select id, plan, trial_ends_at from organizations
       where lower(nullif(trim(temp_host), '')) = $1
          or lower(nullif(trim(custom_domain), '')) = $1
       limit 1`,
      [host],
    )
    const row = found.rows[0]
    if (!row?.id?.trim()) return null
    return {
      id: row.id.trim(),
      plan: (row.plan || 'demo') as OrgPlan,
      trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
    }
  } catch {
    return null
  }
}

export async function organizationIdFromHostHeader(req: Request): Promise<string | null> {
  const row = await organizationFromHostHeader(req)
  return row?.id ?? null
}

export async function sqlForOrg<T extends QueryResultRow = QueryResultRow>(
  orgId: string | null | undefined,
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const id = requireOrganizationId(orgId)
  const pool = getPool()
  if (!pool) throw new Error('Commons database is not configured')
  if (/^\s*(insert|update|delete|merge)/i.test(text)) {
    await assertOrgWritable(id)
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`select set_config('app.org_id', $1, true)`, [id])
    const result = await client.query<T>(text, params)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    throw err
  } finally {
    client.release()
  }
}

export async function withOrgClient<T>(
  orgId: string | null | undefined,
  fn: (client: PoolClient, orgId: string) => Promise<T>,
): Promise<T> {
  const id = requireOrganizationId(orgId)
  const pool = getPool()
  if (!pool) throw new Error('Commons database is not configured')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`select set_config('app.org_id', $1, true)`, [id])
    const result = await fn(client, id)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    throw err
  } finally {
    client.release()
  }
}

export async function listOrganizationIds(): Promise<string[]> {
  if (!commonsDbEnabled()) return []
  const result = await sql<{ id: string }>(`select id from organizations`)
  return result.rows.map((r) => r.id)
}
