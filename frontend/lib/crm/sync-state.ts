import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { requireOrganizationId, sqlForOrg } from '@/lib/crm/tenant'

const SILENCE_MS = 24 * 60 * 60 * 1000

export type SyncChannel = 'square' | 'plaid' | 'backup'

export type OrgSyncState = {
  organizationId: string
  squareLastOkAt: string | null
  plaidLastOkAt: string | null
  backupLastOkAt: string | null
  squareError: string
  plaidError: string
  backupError: string
  squareSilent: boolean
  plaidSilent: boolean
  backupSilent: boolean
}

function silent(iso: string | null, hasConnector: boolean): boolean {
  if (!hasConnector) return false
  if (!iso) return true
  const t = Date.parse(iso)
  return !Number.isFinite(t) || Date.now() - t > SILENCE_MS
}

export async function markSyncOk(orgId: string, channel: SyncChannel): Promise<void> {
  const id = requireOrganizationId(orgId)
  const col = `${channel}_last_ok_at`
  const errCol = `${channel}_error`
  await sqlForOrg(
    id,
    `insert into organization_sync_state (organization_id, ${col}, ${errCol}, updated_at)
     values ($1, now(), '', now())
     on conflict (organization_id) do update set
       ${col} = now(),
       ${errCol} = '',
       updated_at = now()`,
    [id],
  )
}

export async function markSyncError(
  orgId: string,
  channel: SyncChannel,
  message: string,
): Promise<void> {
  const id = requireOrganizationId(orgId)
  const errCol = `${channel}_error`
  await sqlForOrg(
    id,
    `insert into organization_sync_state (organization_id, ${errCol}, updated_at)
     values ($1, $2, now())
     on conflict (organization_id) do update set
       ${errCol} = excluded.${errCol},
       updated_at = now()`,
    [id, message.slice(0, 500)],
  )
}

export async function getOrgSyncState(orgId: string): Promise<OrgSyncState | null> {
  if (!commonsDbEnabled()) return null
  const id = requireOrganizationId(orgId)
  const row = await sqlForOrg<{
    square_last_ok_at: Date | null
    plaid_last_ok_at: Date | null
    backup_last_ok_at: Date | null
    square_error: string
    plaid_error: string
    backup_error: string
  }>(
    id,
    `select square_last_ok_at, plaid_last_ok_at, backup_last_ok_at,
            square_error, plaid_error, backup_error
       from organization_sync_state
      where organization_id = $1`,
    [id],
  )
  const r = row.rows[0]
  const connectors = await sqlForOrg<{ provider: string }>(
    id,
    `select provider from organization_connectors where organization_id = $1`,
    [id],
  )
  const providers = new Set(connectors.rows.map((c) => c.provider))
  const squareLast = r?.square_last_ok_at ? r.square_last_ok_at.toISOString() : null
  const plaidLast = r?.plaid_last_ok_at ? r.plaid_last_ok_at.toISOString() : null
  const backupLast = r?.backup_last_ok_at ? r.backup_last_ok_at.toISOString() : null
  return {
    organizationId: id,
    squareLastOkAt: squareLast,
    plaidLastOkAt: plaidLast,
    backupLastOkAt: backupLast,
    squareError: r?.square_error || '',
    plaidError: r?.plaid_error || '',
    backupError: r?.backup_error || '',
    squareSilent: silent(squareLast, providers.has('square')),
    plaidSilent: silent(plaidLast, providers.has('plaid')),
    backupSilent: silent(backupLast, Boolean(backupLast) || Boolean(r?.backup_error)),
  }
}

export async function listSilentOrgs(): Promise<OrgSyncState[]> {
  if (!commonsDbEnabled()) return []
  const orgs = await sql<{ id: string }>(`select id from organizations`)
  const out: OrgSyncState[] = []
  for (const org of orgs.rows) {
    const state = await getOrgSyncState(org.id)
    if (!state) continue
    if (state.squareSilent || state.plaidSilent || state.backupSilent) out.push(state)
  }
  return out
}

export function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'Never synced'
  return `Last successful sync ${new Date(t).toISOString().replace('T', ' ').slice(0, 16)} UTC`
}
