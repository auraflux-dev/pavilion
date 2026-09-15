import 'server-only'

import { commonsDbEnabled, sql } from '@/lib/crm/db'
import type { CompanyProduct } from '@/lib/crm/platform-owners'
import type { SiteAuditReport } from '@/lib/staff/seo/site-audit'
import {
  defaultBundle,
  type GscQueryRow,
  type WorkspaceBundle,
  type WorkspaceIntegration,
} from '@/lib/staff/seo/workspace'

const memBundles = new Map<string, WorkspaceBundle>()
const memAudits = new Map<string, SiteAuditReport>()
const memGsc = new Map<string, { importedAt: string; rows: GscQueryRow[] }>()

function domainKey(workspaceId: string) {
  return workspaceId.trim().toLowerCase()
}

async function ready() {
  if (!commonsDbEnabled()) return
  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ready()
}

export async function loadWorkspaceBundle(
  workspaceId: string,
  product: CompanyProduct,
): Promise<WorkspaceBundle> {
  const id = domainKey(workspaceId)
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql<{ bundle: WorkspaceBundle }>(
      `select bundle from pavilion_seo_workspace_bundles where id = $1 limit 1`,
      [id],
    )
    const row = res.rows[0]?.bundle
    if (row?.config) return row
  }
  const existing = memBundles.get(id)
  if (existing) return existing
  const created = defaultBundle({ workspaceId: id, product })
  memBundles.set(id, created)
  return created
}

export async function saveWorkspaceBundle(bundle: WorkspaceBundle): Promise<void> {
  const id = domainKey(bundle.config.id)
  bundle.config.updatedAt = new Date().toISOString()
  memBundles.set(id, bundle)
  if (!commonsDbEnabled()) return
  await ready()
  await sql(
    `insert into pavilion_seo_workspace_bundles (id, bundle, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set bundle = excluded.bundle, updated_at = now()`,
    [id, JSON.stringify(bundle)],
  )
}

export async function upsertIntegration(
  workspaceId: string,
  product: CompanyProduct,
  integration: WorkspaceIntegration,
): Promise<WorkspaceBundle> {
  const bundle = await loadWorkspaceBundle(workspaceId, product)
  const rest = bundle.config.connection.integrations.filter((i) => i.tool !== integration.tool)
  bundle.config.connection.integrations = [...rest, integration]
  bundle.config.connection.liveGoogle = true
  if (integration.tool === 'gsc' && integration.propertyId) {
    bundle.config.connection.gscSiteUrl = integration.propertyId
  }
  if (integration.tool === 'ga4' && integration.propertyId) {
    bundle.config.connection.ga4PropertyId = integration.propertyId
  }
  await saveWorkspaceBundle(bundle)
  return bundle
}

export type PublicWorkspaceBundle = {
  config: Omit<WorkspaceBundle['config'], 'connection'> & {
    connection: Omit<WorkspaceBundle['config']['connection'], 'integrations'> & {
      integrations: Array<Omit<WorkspaceIntegration, 'refreshTokenEnc'> & { connected: boolean }>
    }
  }
  ideas: WorkspaceBundle['ideas']
  metrics: WorkspaceBundle['metrics']
}

export function publicBundle(bundle: WorkspaceBundle): PublicWorkspaceBundle {
  return {
    ...bundle,
    config: {
      ...bundle.config,
      connection: {
        gscSiteUrl: bundle.config.connection.gscSiteUrl,
        ga4PropertyId: bundle.config.connection.ga4PropertyId,
        liveGoogle: bundle.config.connection.liveGoogle,
        integrations: bundle.config.connection.integrations.map((i) => {
          const { refreshTokenEnc, ...rest } = i
          return { ...rest, connected: Boolean(refreshTokenEnc) }
        }),
      },
    },
  }
}

export async function saveAudit(workspaceId: string, report: SiteAuditReport): Promise<void> {
  const id = domainKey(workspaceId)
  memAudits.set(id, report)
  if (!commonsDbEnabled()) return
  await ready()
  await sql(
    `insert into pavilion_seo_audits (domain_key, report, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (domain_key) do update set report = excluded.report, updated_at = now()`,
    [id, JSON.stringify(report)],
  )
}

export async function loadAudit(workspaceId: string): Promise<SiteAuditReport | null> {
  const id = domainKey(workspaceId)
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql<{ report: SiteAuditReport }>(
      `select report from pavilion_seo_audits where domain_key = $1 limit 1`,
      [id],
    )
    if (res.rows[0]?.report) return res.rows[0].report
  }
  return memAudits.get(id) || null
}

export async function saveGscImport(
  workspaceId: string,
  rows: GscQueryRow[],
): Promise<void> {
  const id = domainKey(workspaceId)
  const payload = { importedAt: new Date().toISOString(), rows }
  memGsc.set(id, payload)
  if (!commonsDbEnabled()) return
  await ready()
  await sql(
    `insert into pavilion_seo_gsc_imports (domain_key, import, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (domain_key) do update set import = excluded.import, updated_at = now()`,
    [id, JSON.stringify(payload)],
  )
}

export async function loadGscImport(
  workspaceId: string,
): Promise<{ importedAt: string; rows: GscQueryRow[] } | null> {
  const id = domainKey(workspaceId)
  if (commonsDbEnabled()) {
    await ready()
    const res = await sql<{ import: { importedAt: string; rows: GscQueryRow[] } }>(
      `select import from pavilion_seo_gsc_imports where domain_key = $1 limit 1`,
      [id],
    )
    if (res.rows[0]?.import) return res.rows[0].import
  }
  return memGsc.get(id) || null
}

export async function lastSeoRows() {
  if (!commonsDbEnabled()) {
    return { db: false, audits: 0, gsc: 0, bundles: memBundles.size }
  }
  await ready()
  const [a, g, b] = await Promise.all([
    sql<{ n: string }>(`select count(*)::text as n from pavilion_seo_audits`),
    sql<{ n: string }>(`select count(*)::text as n from pavilion_seo_gsc_imports`),
    sql<{ n: string }>(`select count(*)::text as n from pavilion_seo_workspace_bundles`),
  ])
  return {
    db: true,
    audits: Number(a.rows[0]?.n || 0),
    gsc: Number(g.rows[0]?.n || 0),
    bundles: Number(b.rows[0]?.n || 0),
  }
}
