/**
 * Staff tablet check-in: mark tickets, signup claims, or walk-ins as arrived.
 * Stored in Pavilion CMS (org-scoped), not Wix.
 */
import 'server-only'

import { randomUUID } from 'crypto'
import { sqlForOrg } from '@/lib/crm/tenant'
import { pavilionCmsEnabled } from '@/lib/cms/store'

export type CheckInKind = 'ticket' | 'signup' | 'volunteer' | 'walkin'

export type CheckInRecord = {
  id: string
  kind: CheckInKind
  code: string
  label: string
  eventKey: string
  checkedInAt: string
  checkedInBy: string
}

/** Ensure check-in table exists (additive migration alongside CMS schema). */
export async function ensureCheckInSchema(orgId: string): Promise<void> {
  if (!pavilionCmsEnabled()) return
  await sqlForOrg(
    orgId,
    `create table if not exists cms_check_ins (
      id               text primary key,
      organization_id  text not null references organizations (id) on delete cascade,
      kind             text not null,
      code             text not null,
      label            text not null default '',
      event_key        text not null default '',
      checked_in_by    text not null default '',
      checked_in_at    timestamptz not null default now(),
      unique (organization_id, kind, code, event_key)
    )`,
    [],
  )
}

export async function recordCheckIn(input: {
  orgId: string
  kind: CheckInKind
  code: string
  label?: string
  eventKey?: string
  checkedInBy: string
}): Promise<CheckInRecord> {
  await ensureCheckInSchema(input.orgId)
  const code = input.code.trim().toUpperCase()
  if (!code) throw new Error('code required')
  const id = randomUUID()
  const eventKey = (input.eventKey || 'default').trim() || 'default'
  const label = (input.label || code).trim()
  await sqlForOrg(
    input.orgId,
    `insert into cms_check_ins
      (id, organization_id, kind, code, label, event_key, checked_in_by)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (organization_id, kind, code, event_key) do update set
       label = excluded.label,
       checked_in_by = excluded.checked_in_by,
       checked_in_at = now()
     returning id, kind, code, label, event_key, checked_in_by, checked_in_at`,
    [id, input.orgId, input.kind, code, label, eventKey, input.checkedInBy],
  )
  return {
    id,
    kind: input.kind,
    code,
    label,
    eventKey,
    checkedInAt: new Date().toISOString(),
    checkedInBy: input.checkedInBy,
  }
}

export async function lookupCheckIn(
  orgId: string,
  kind: CheckInKind,
  code: string,
  eventKey = 'default',
): Promise<CheckInRecord | null> {
  await ensureCheckInSchema(orgId)
  const res = await sqlForOrg<{
    id: string
    kind: string
    code: string
    label: string
    event_key: string
    checked_in_by: string
    checked_in_at: Date
  }>(
    orgId,
    `select id, kind, code, label, event_key, checked_in_by, checked_in_at
       from cms_check_ins
      where organization_id = $1 and kind = $2 and code = $3 and event_key = $4
      limit 1`,
    [orgId, kind, code.trim().toUpperCase(), eventKey],
  )
  const r = res.rows[0]
  if (!r) return null
  return {
    id: r.id,
    kind: r.kind as CheckInKind,
    code: r.code,
    label: r.label,
    eventKey: r.event_key,
    checkedInAt: new Date(r.checked_in_at).toISOString(),
    checkedInBy: r.checked_in_by,
  }
}

export async function listRecentCheckIns(
  orgId: string,
  eventKey = 'default',
  limit = 40,
): Promise<CheckInRecord[]> {
  await ensureCheckInSchema(orgId)
  const res = await sqlForOrg<{
    id: string
    kind: string
    code: string
    label: string
    event_key: string
    checked_in_by: string
    checked_in_at: Date
  }>(
    orgId,
    `select id, kind, code, label, event_key, checked_in_by, checked_in_at
       from cms_check_ins
      where organization_id = $1 and event_key = $2
      order by checked_in_at desc
      limit $3`,
    [orgId, eventKey, limit],
  )
  return res.rows.map((r) => ({
    id: r.id,
    kind: r.kind as CheckInKind,
    code: r.code,
    label: r.label,
    eventKey: r.event_key,
    checkedInAt: new Date(r.checked_in_at).toISOString(),
    checkedInBy: r.checked_in_by,
  }))
}
