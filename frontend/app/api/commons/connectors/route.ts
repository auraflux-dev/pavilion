/**
 * GET  /api/commons/connectors — status for this org (no secrets).
 * DELETE /api/commons/connectors?provider=square|plaid — disconnect.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/security/csrf'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { connectorMeta, deleteConnector, type ConnectorProvider } from '@/lib/crm/connectors'
import { getOrgSyncState } from '@/lib/crm/sync-state'
import { squareOAuthConfigured } from '@/lib/crm/square-oauth'
import { plaidConfigured } from '@/lib/staff/plaid'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!commonsDbEnabled()) {
    return NextResponse.json({ configured: false })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const meta = await connectorMeta(orgId)
    const sync = await getOrgSyncState(orgId)
    return NextResponse.json({
      configured: true,
      squareOAuthReady: squareOAuthConfigured(),
      plaidReady: plaidConfigured(),
      squareConnected: meta.square,
      plaidConnected: meta.plaid,
      squareMerchantId: meta.squareMerchantId ? `${meta.squareMerchantId.slice(0, 6)}…` : '',
      plaidItemId: meta.plaidItemId ? `${meta.plaidItemId.slice(0, 8)}…` : '',
      squareLastOkAt: sync?.squareLastOkAt ?? null,
      plaidLastOkAt: sync?.plaidLastOkAt ?? null,
      squareError: sync?.squareError ?? '',
      plaidError: sync?.plaidError ?? '',
    })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Could not load connectors' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }
  const provider = (req.nextUrl.searchParams.get('provider') || '').trim() as ConnectorProvider
  if (provider !== 'square' && provider !== 'plaid') {
    return NextResponse.json({ error: 'provider=square|plaid required' }, { status: 400 })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    await deleteConnector(orgId, provider)
    return NextResponse.json({ ok: true, provider })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
