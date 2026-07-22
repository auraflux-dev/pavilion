/**
 * Append-only staff audit events (act-as, sensitive mutations).
 * Writes to Wix CMS StaffAuditLog when available; always structured-logs.
 */

import { getWixClient } from '@/lib/wix-client'

export type AuditEvent = {
  action: string
  actorEmail: string
  targetEmail?: string
  detail?: string
  route?: string
  ip?: string
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
  console.info('[staff-audit]', JSON.stringify(row))
  try {
    const client = getWixClient()
    await client.items.insert('StaffAuditLog', row)
  } catch (err) {
    console.warn('[staff-audit] CMS insert skipped', err instanceof Error ? err.message : err)
  }
}
