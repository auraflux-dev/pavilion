import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { isDemoInstance } from '@/lib/demo/instance'

let pool: Pool | null = null

export function commonsDbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && isDemoInstance()
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
