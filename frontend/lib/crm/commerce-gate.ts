import { sql } from '@/lib/crm/db'
import { getOrgBilling } from '@/lib/crm/org-plan'
import { organizationIdFromRequest, requireOrganizationId } from '@/lib/crm/tenant'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'
import { isDemoInstance } from '@/lib/demo/instance'

export async function orgHasSquare(orgId: string): Promise<boolean> {
  const id = requireOrganizationId(orgId)
  const found = await sql<{ ok: number }>(
    `select 1 as ok from organization_connectors
      where organization_id = $1 and provider = 'square'
      limit 1`,
    [id],
  )
  return Boolean(found.rows[0])
}

export type LiveCommerceGate = {
  liveCommerce: boolean
  reason: 'stone-hill' | 'demo' | 'square-not-connected' | 'sign-in-required' | 'ok'
  note: string
}

export async function liveCommerceGate(req: Request): Promise<LiveCommerceGate> {
  if (isDemoInstance()) {
    return {
      liveCommerce: false,
      reason: 'demo',
      note: 'Sample school.\nLive checkout and card loads stay off here.',
    }
  }
  if (!isCommonsPlatformHost()) {
    return { liveCommerce: true, reason: 'stone-hill', note: '' }
  }
  try {
    const orgId = await organizationIdFromRequest(req)
    const billing = await getOrgBilling(orgId)
    if (billing?.plan === 'demo') {
      return {
        liveCommerce: false,
        reason: 'demo',
        note: 'Sample school.\nLive checkout and card loads stay off here.',
      }
    }
    const hasSquare = await orgHasSquare(orgId)
    if (!hasSquare) {
      return {
        liveCommerce: false,
        reason: 'square-not-connected',
        note:
          'Connect Square in Staff → Payments first.\nThen checkout, card loads, and in-person POS turn on.',
      }
    }
    return { liveCommerce: true, reason: 'ok', note: '' }
  } catch {
    return {
      liveCommerce: false,
      reason: 'sign-in-required',
      note: 'Sign in to load a card or pay online.',
    }
  }
}
