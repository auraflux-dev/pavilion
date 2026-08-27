import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  SITE_SETTING_GROUPS,
  settingGroupsForRoles,
  upsertSiteSetting,
} from '@/lib/staff/cms-catalog'
import type { StaffRole } from '@/lib/staff/roles'
import { revalidatePublicSiteShell } from '@/lib/staff/revalidate-public'
import { CONTACT_DEFAULTS } from '@/lib/defaults/page-content'

/** Code fallbacks shown in Staff when SiteSettings row is empty (matches public site). */
const SITE_SETTING_CODE_DEFAULTS: Record<string, string> = {
  ...CONTACT_DEFAULTS,
  storeHours: CONTACT_DEFAULTS.contactStoreHours,
}

function normalizeRetailValue(value: string) {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',')
}

function allowedKeysForSession(roles: StaffRole[], isAdmin: boolean): Set<string> {
  const keys = new Set<string>()
  for (const g of settingGroupsForRoles(roles, isAdmin)) {
    for (const k of g.keys) keys.add(k.key)
  }
  return keys
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const isAdmin = requireStaffRole(session.staff, 'admin')
  const groups = settingGroupsForRoles(session.staff.roles, isAdmin)
  if (!groups.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const map: Record<string, { id: string; value: string }> = {}
    const { pavilionCmsEnabled, resolveCmsOrganizationId, listCmsSiteSettings } =
      await import('@/lib/cms/store')
    if (pavilionCmsEnabled()) {
      const orgId = await resolveCmsOrganizationId(req)
      if (orgId) {
        const cmsMap = await listCmsSiteSettings(orgId)
        for (const [key, value] of Object.entries(cmsMap)) {
          map[key] = { id: key, value }
        }
      }
    } else {
      const client = getWixClient()
      const result = await client.items.query('SiteSettings').limit(200).find()
      for (const item of result.items ?? []) {
        const row = item as { _id?: string; key?: string; value?: string }
        if (row.key) map[row.key] = { id: row._id ?? '', value: String(row.value ?? '') }
      }
    }

    const settings: Record<string, string> = {}
    const ids: Record<string, string> = {}
    for (const g of groups) {
      for (const k of g.keys) {
        const cms = map[k.key]?.value ?? ''
        settings[k.key] = cms.trim() || (SITE_SETTING_CODE_DEFAULTS[k.key] ?? '')
        ids[k.key] = map[k.key]?.id ?? ''
      }
    }

    return NextResponse.json({
      groups: groups.map((g) => ({ id: g.id, label: g.label, keys: g.keys })),
      settings,
      ids,
      // back-compat for retail panel
      storeProductIds: settings.storeProductIds ?? map.storeProductIds?.value ?? '',
      spiritWearProductIds: settings.spiritWearProductIds ?? map.spiritWearProductIds?.value ?? '',
    })
  } catch (err) {
    console.error('/api/staff/site-settings GET', err)
    return NextResponse.json({ error: 'Could not load settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const isAdmin = requireStaffRole(session.staff, 'admin')
  const allowed = allowedKeysForSession(session.staff.roles, isAdmin)

  try {
    const body = await req.json()
    const key = String(body.key ?? '').trim()
    if (!allowed.has(key)) {
      return NextResponse.json({ error: `Not allowed to edit “${key}” for your role` }, { status: 403 })
    }
    let value = String(body.value ?? '')
    if (key === 'storeProductIds' || key === 'spiritWearProductIds') {
      value = normalizeRetailValue(value)
    }
    await upsertSiteSetting(key, value)
    revalidatePublicSiteShell()
    return NextResponse.json({ ok: true, key, value })
  } catch (err) {
    console.error('/api/staff/site-settings PATCH', err)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }
}

/** Expose catalog for docs/tests */
export function allSiteSettingKeys() {
  return SITE_SETTING_GROUPS.flatMap((g) => g.keys.map((k) => k.key))
}
