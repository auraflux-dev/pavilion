/**
 * Append-only staff audit events (act-as, sensitive mutations).
 * Writes to Wix CMS StaffAuditLog when available; always structured-logs.
 */

import { getWixClient } from '@/lib/wix-client'
import { commonsDbEnabled } from '@/lib/crm/db'
import { sqlForOrg } from '@/lib/crm/tenant'

export type AuditEvent = {
  action: string
  actorEmail: string
  targetEmail?: string
  detail?: string
  route?: string
  ip?: string
  organizationId?: string
}

export async function writeStaffAudit(event: AuditEvent): Promise<void> {
  const row = {
    action: event.action,
    actorEmail: event.actorEmail.trim().toLowerCase(),
    targetEmail: (event.targetEmail || '').trim().toLowerCase(),
    detail: event.detail || '',
    route: event.route || '',
    ip: event.ip || '',
    createdAt: new Date().toISOString(),
  }
  console.info('[staff-audit]', JSON.stringify({ ...row, organizationId: event.organizationId || '' }))
  if (commonsDbEnabled() && event.organizationId) {
    try {
      await sqlForOrg(
        event.organizationId,
        `insert into staff_audit (
           organization_id, action, actor_email, target_email, detail, route, ip
         ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.organizationId,
          event.action,
          row.actorEmail,
          row.targetEmail,
          row.detail,
          row.route,
          row.ip,
        ],
      )
    } catch (err) {
      console.warn(
        '[staff-audit] Postgres insert skipped',
        err instanceof Error ? err.message : err,
      )
    }
  }
  try {
    const client = getWixClient()
    await client.items.insert('StaffAuditLog', row)
  } catch (err) {
    console.warn('[staff-audit] CMS insert skipped', err instanceof Error ? err.message : err)
  }
}
