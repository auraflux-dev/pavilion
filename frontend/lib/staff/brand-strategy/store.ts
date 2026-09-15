import 'server-only'

import { randomUUID } from 'crypto'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import type {
  BrandFollowup,
  BrandKit,
  BrandKitInputs,
  BrandKitStatus,
  BrandOutputJson,
  BrandWorkspaceId,
} from '@/lib/staff/brand-strategy/types'

const mem = new Map<string, BrandKit[]>()

async function ready() {
  if (!commonsDbEnabled()) return
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ready()
}

function mapKit(r: Record<string, unknown>): BrandKit {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    status: String(r.status),
    title: String(r.title),
    inputs: (r.inputs || {}) as BrandKitInputs,
    followups: (Array.isArray(r.followups) ? r.followups : []) as BrandFollowup[],
    outputMd: r.output_md != null ? String(r.output_md) : null,
    outputJson: (r.output_json || null) as BrandOutputJson | null,
    yamlTokens: r.yaml_tokens != null ? String(r.yaml_tokens) : null,
    model: r.model != null ? String(r.model) : null,
    createdBy: r.created_by != null ? String(r.created_by) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    approvedAt: r.approved_at ? new Date(String(r.approved_at)).toISOString() : null,
  }
}

export async function listKits(workspaceId: BrandWorkspaceId): Promise<BrandKit[]> {
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql(
      `select * from pavilion_brand_kits where workspace_id = $1 order by updated_at desc`,
      [workspaceId],
    )
    return res.rows.map((r) => mapKit(r as Record<string, unknown>))
  }
  return mem.get(workspaceId) || []
}

export async function getKit(workspaceId: BrandWorkspaceId, kitId: string): Promise<BrandKit | null> {
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql(
      `select * from pavilion_brand_kits where workspace_id = $1 and id = $2 limit 1`,
      [workspaceId, kitId],
    )
    const row = res.rows[0]
    return row ? mapKit(row as Record<string, unknown>) : null
  }
  return (mem.get(workspaceId) || []).find((k) => k.id === kitId) || null
}

export async function getActiveKit(workspaceId: BrandWorkspaceId): Promise<BrandKit | null> {
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql(
      `select * from pavilion_brand_kits
       where workspace_id = $1 and status = 'approved'
       order by approved_at desc nulls last, updated_at desc
       limit 1`,
      [workspaceId],
    )
    const row = res.rows[0]
    return row ? mapKit(row as Record<string, unknown>) : null
  }
  const kits = mem.get(workspaceId) || []
  return kits.filter((k) => k.status === 'approved').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null
}

export async function createKit(input: {
  workspaceId: BrandWorkspaceId
  inputs: BrandKitInputs
  createdBy?: string | null
}): Promise<BrandKit> {
  const id = `kit_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  const now = new Date().toISOString()
  const kit: BrandKit = {
    id,
    workspaceId: input.workspaceId,
    status: 'draft',
    title: input.inputs.brandName || 'Untitled brand kit',
    inputs: input.inputs,
    followups: [],
    outputMd: null,
    outputJson: null,
    yamlTokens: null,
    model: null,
    createdBy: input.createdBy || null,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
  }
  if (commonsDbEnabled()) {
    await ready()
    await sql(
      `insert into pavilion_brand_kits (
        id, workspace_id, status, title, inputs, followups, created_by, created_at, updated_at
      ) values ($1,$2,'draft',$3,$4::jsonb,'[]'::jsonb,$5,$6,$6)`,
      [id, input.workspaceId, kit.title, JSON.stringify(input.inputs), input.createdBy || null, now],
    )
    const saved = await getKit(input.workspaceId, id)
    if (!saved) throw new Error('Failed to create brand kit')
    return saved
  }
  mem.set(input.workspaceId, [kit, ...(mem.get(input.workspaceId) || [])])
  return kit
}

export async function updateKit(
  workspaceId: BrandWorkspaceId,
  kitId: string,
  patch: Partial<{
    status: BrandKitStatus | string
    title: string
    inputs: BrandKitInputs
    followups: BrandFollowup[]
    outputMd: string | null
    outputJson: BrandOutputJson | null
    yamlTokens: string | null
    model: string | null
    approvedAt: string | null
  }>,
  opts?: { snapshotNote?: string; createdBy?: string | null },
): Promise<BrandKit | null> {
  const prev = await getKit(workspaceId, kitId)
  if (!prev) return null
  const now = new Date().toISOString()
  const next: BrandKit = { ...prev, ...patch, updatedAt: now }
  if (commonsDbEnabled()) {
    await ready()
    await sql(
      `update pavilion_brand_kits set
        status = $3, title = $4, inputs = $5::jsonb, followups = $6::jsonb,
        output_md = $7, output_json = $8::jsonb, yaml_tokens = $9, model = $10,
        approved_at = $11, updated_at = $12
       where workspace_id = $1 and id = $2`,
      [
        workspaceId,
        kitId,
        next.status,
        next.title,
        JSON.stringify(next.inputs),
        JSON.stringify(next.followups),
        next.outputMd,
        next.outputJson ? JSON.stringify(next.outputJson) : null,
        next.yamlTokens,
        next.model,
        next.approvedAt,
        now,
      ],
    )
    if (opts?.snapshotNote) {
      await sql(
        `insert into pavilion_brand_kit_versions (
          id, kit_id, workspace_id, status, inputs, followups, output_md, output_json,
          yaml_tokens, model, created_by, created_at, note
        ) values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12,$13)`,
        [
          `ver_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          kitId,
          workspaceId,
          next.status,
          JSON.stringify(next.inputs),
          JSON.stringify(next.followups),
          next.outputMd,
          next.outputJson ? JSON.stringify(next.outputJson) : null,
          next.yamlTokens,
          next.model,
          opts.createdBy || next.createdBy,
          now,
          opts.snapshotNote,
        ],
      )
    }
    return getKit(workspaceId, kitId)
  }
  const list = (mem.get(workspaceId) || []).map((k) => (k.id === kitId ? next : k))
  mem.set(workspaceId, list)
  return next
}

export async function countBrandKits(): Promise<number> {
  if (!commonsDbEnabled()) {
    let n = 0
    for (const kits of mem.values()) n += kits.length
    return n
  }
  await ready()
  const res = await sql<{ n: string }>(`select count(*)::text as n from pavilion_brand_kits`)
  return Number(res.rows[0]?.n || 0)
}
