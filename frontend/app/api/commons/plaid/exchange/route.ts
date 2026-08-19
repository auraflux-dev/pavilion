/**
 * POST /api/commons/plaid/exchange — store Item access token on this organization.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/security/csrf'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { putConnector } from '@/lib/crm/connectors'
import { markSyncOk } from '@/lib/crm/sync-state'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { getPlaidClient, plaidAxiosError, plaidConfigured } from '@/lib/staff/plaid'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!commonsDbEnabled() || !plaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured for Commons' }, { status: 503 })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const body = (await req.json().catch(() => ({}))) as { public_token?: string }
    const publicToken = body.public_token?.trim()
    if (!publicToken) return NextResponse.json({ error: 'public_token required' }, { status: 400 })
    const client = getPlaidClient()
    const exchanged = await client.itemPublicTokenExchange({ public_token: publicToken })
    const itemId = exchanged.data.item_id
    const accessToken = exchanged.data.access_token
    let institutionName = ''
    try {
      const item = await client.itemGet({ access_token: accessToken })
      institutionName = item.data.item.institution_id || ''
    } catch {
      // optional
    }
    await putConnector(
      orgId,
      'plaid',
      { accessToken, itemId, institutionName, cursor: '' },
      { itemId },
    )
    await markSyncOk(orgId, 'plaid')
    return NextResponse.json({ ok: true, itemId })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const plaid = plaidAxiosError(err)
    return NextResponse.json(
      { error: plaid?.message || (err instanceof Error ? err.message : 'Exchange failed') },
      { status: 400 },
    )
  }
}
