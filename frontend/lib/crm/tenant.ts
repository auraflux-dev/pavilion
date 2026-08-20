import type { PoolClient, QueryResult, QueryResultRow } from 'pg'
import { getAuth } from '@/lib/crm/auth'
import { commonsDbEnabled, getPool, sql } from '@/lib/crm/db'
import { isDemoInstance } from '@/lib/demo/instance'
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
    if (isDemoInstance()) return requireOrganizationId(riversideSnapshot().organization.id)
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

  if (isDemoInstance()) return requireOrganizationId(riversideSnapshot().organization.id)
  throw new MissingOrganizationIdError()
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
    const billing = await sql<{ plan: string | null; trial_ends_at: Date | null }>(
      `select plan, trial_ends_at from organizations where id = $1`,
      [id],
    )
    const row = billing.rows[0]
    if (row) {
      const plan = row.plan || 'demo'
      const trialEnded =
        plan === 'trial' &&
        row.trial_ends_at &&
        Date.now() >= row.trial_ends_at.getTime()
      if (plan === 'locked' || trialEnded) {
        const err = new Error(
          'Trial ended. Data stays for 30 days. Subscribe to keep writing.',
        ) as Error & { status: number }
        err.status = 402
        throw err
      }
    }
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
