import 'server-only'

import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { isDemoInstance } from '@/lib/demo/instance'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

let pool: Pool | null = null

/** True on the Commons demo project or a paying Commons app. Never set DATABASE_URL on Stone Hill. */
export function isCommonsPlatform(): boolean {
  return isDemoInstance() || isPavilionProductPlatform()
}

export function commonsDbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && isCommonsPlatform()
}

export function getPool(): Pool | null {
  if (!commonsDbEnabled()) return null
  if (!pool) {
    const connectionString = process.env.DATABASE_URL!.trim()
    pool = new Pool({
      connectionString,
      max: 1,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString)
        ? undefined
        : { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const p = getPool()
  if (!p) throw new Error('Commons database is not configured')
  return p.query<T>(text, params)
}
