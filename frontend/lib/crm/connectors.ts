import { decryptJson, encryptJson } from '@/lib/crm/crypto'
import { requireOrganizationId, sqlForOrg } from '@/lib/crm/tenant'
import { sql } from '@/lib/crm/db'

export type ConnectorProvider = 'square' | 'plaid'

export type SquareConnectorSecret = {
  accessToken: string
  refreshToken: string
  merchantId: string
  expiresAt: string | null
}

export type PlaidConnectorSecret = {
  accessToken: string
  itemId: string
  institutionName: string
  cursor: string
}

export async function putConnector(
  orgId: string,
  provider: ConnectorProvider,
  secret: SquareConnectorSecret | PlaidConnectorSecret,
  meta: { merchantId?: string; itemId?: string; expiresAt?: string | null },
): Promise<void> {
  const id = requireOrganizationId(orgId)
  await sqlForOrg(
    id,
    `insert into organization_connectors (
       organization_id, provider, ciphertext, merchant_id, item_id, expires_at, updated_at
     ) values ($1, $2, $3, $4, $5, $6, now())
     on conflict (organization_id, provider) do update set
       ciphertext = excluded.ciphertext,
       merchant_id = excluded.merchant_id,
       item_id = excluded.item_id,
       expires_at = excluded.expires_at,
       updated_at = now()`,
    [
      id,
      provider,
      encryptJson(secret),
      meta.merchantId || '',
      meta.itemId || '',
      meta.expiresAt || null,
    ],
  )
}

export async function getConnector<T>(
  orgId: string,
  provider: ConnectorProvider,
): Promise<T | null> {
  const id = requireOrganizationId(orgId)
  const found = await sqlForOrg<{ ciphertext: string }>(
    id,
    `select ciphertext from organization_connectors
      where organization_id = $1 and provider = $2`,
    [id, provider],
  )
  const row = found.rows[0]
  if (!row) return null
  return decryptJson<T>(row.ciphertext)
}

export async function orgIdForMerchant(merchantId: string): Promise<string | null> {
  const id = merchantId.trim()
  if (!id) return null
  const found = await sql<{ organization_id: string }>(
    `select organization_id from organization_connectors
      where provider = 'square' and merchant_id = $1 limit 1`,
    [id],
  )
  return found.rows[0]?.organization_id || null
}

export async function orgIdForPlaidItem(itemId: string): Promise<string | null> {
  const id = itemId.trim()
  if (!id) return null
  const found = await sql<{ organization_id: string }>(
    `select organization_id from organization_connectors
      where provider = 'plaid' and item_id = $1 limit 1`,
    [id],
  )
  return found.rows[0]?.organization_id || null
}

export async function listOrgsWithProvider(provider: ConnectorProvider): Promise<string[]> {
  const found = await sql<{ organization_id: string }>(
    `select organization_id from organization_connectors where provider = $1`,
    [provider],
  )
  return found.rows.map((r) => r.organization_id)
}
