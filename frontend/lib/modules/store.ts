/**
 * Org-scoped enabled modules (checkboxes for customer builds).
 */
import 'server-only'

import { sqlForOrg } from '@/lib/crm/tenant'
import { pavilionCmsEnabled, resolveCmsOrganizationId } from '@/lib/cms/store'
import {
  MODULE_PRESET_PAVILION_DEMO,
  MODULE_PRESET_PAVILION_TRIAL,
  sanitizeEnabledModules,
  type ProductModuleId,
} from '@/lib/modules/catalog'
import { isDemoInstance, isDemoInstanceFromRequest } from '@/lib/demo/instance'

export async function ensureOrgModulesSchema(orgId: string): Promise<void> {
  if (!pavilionCmsEnabled()) return
  await sqlForOrg(
    orgId,
    `create table if not exists cms_org_modules (
      organization_id  text primary key references organizations (id) on delete cascade,
      modules_json     text not null default '[]',
      updated_at       timestamptz not null default now()
    )`,
    [],
  )
}

export async function getOrgModules(orgId: string): Promise<ProductModuleId[]> {
  if (!pavilionCmsEnabled()) return [...MODULE_PRESET_PAVILION_DEMO.modules]
  await ensureOrgModulesSchema(orgId)
  const res = await sqlForOrg<{ modules_json: string }>(
    orgId,
    `select modules_json from cms_org_modules where organization_id = $1 limit 1`,
    [orgId],
  )
  const raw = res.rows[0]?.modules_json
  const fallback = isDemoInstance()
    ? [...MODULE_PRESET_PAVILION_DEMO.modules]
    : [...MODULE_PRESET_PAVILION_TRIAL.modules]
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as string[]
    return sanitizeEnabledModules(parsed.filter(Boolean) as ProductModuleId[])
  } catch {
    return fallback
  }
}

export async function setOrgModules(
  orgId: string,
  modules: ProductModuleId[],
): Promise<ProductModuleId[]> {
  await ensureOrgModulesSchema(orgId)
  const next = sanitizeEnabledModules(modules)
  await sqlForOrg(
    orgId,
    `insert into cms_org_modules (organization_id, modules_json)
     values ($1, $2)
     on conflict (organization_id) do update set
       modules_json = excluded.modules_json,
       updated_at = now()`,
    [orgId, JSON.stringify(next)],
  )
  return next
}

export async function orgHasModule(orgId: string, id: ProductModuleId): Promise<boolean> {
  const enabled = await getOrgModules(orgId)
  return enabled.includes(id)
}

export async function resolveModulesOrgId(req?: Request): Promise<string | null> {
  return resolveCmsOrganizationId(req)
}

export function defaultModulesForRequest(req?: Request): ProductModuleId[] {
  if (req && isDemoInstanceFromRequest(req)) {
    return [...MODULE_PRESET_PAVILION_DEMO.modules]
  }
  return [...MODULE_PRESET_PAVILION_TRIAL.modules]
}
