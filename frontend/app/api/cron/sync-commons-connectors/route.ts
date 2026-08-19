/**
 * GET /api/cron/sync-commons-connectors
 * Refresh Square tokens, pull Plaid for every org, flag silence.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isDemoInstance } from '@/lib/demo/instance'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { listOrgsWithProvider, getConnector, type PlaidConnectorSecret } from '@/lib/crm/connectors'
import { refreshSquareToken, squareOAuthConfigured } from '@/lib/crm/square-oauth'
import { markSyncError, markSyncOk, listSilentOrgs } from '@/lib/crm/sync-state'
import { getPlaidClient, plaidConfigured } from '@/lib/staff/plaid'
import { putConnector } from '@/lib/crm/connectors'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isDemoInstance() && process.env.COMMONS_PLATFORM !== 'true') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a Commons project' })
  }
  if (!commonsDbEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'No DATABASE_URL' })
  }

  await ensureCommonsReady()
  const squareOrgs: string[] = []
  const plaidOrgs: string[] = []
  const errors: string[] = []

  if (squareOAuthConfigured()) {
    for (const orgId of await listOrgsWithProvider('square')) {
      try {
        await refreshSquareToken(orgId)
        squareOrgs.push(orgId)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`square:${orgId}:${message}`)
        await markSyncError(orgId, 'square', message)
      }
    }
  }

  if (plaidConfigured()) {
    const client = getPlaidClient()
    for (const orgId of await listOrgsWithProvider('plaid')) {
      try {
        const secret = await getConnector<PlaidConnectorSecret>(orgId, 'plaid')
        if (!secret) continue
        const sync = await client.transactionsSync({
          access_token: secret.accessToken,
          cursor: secret.cursor || undefined,
        })
        await putConnector(
          orgId,
          'plaid',
          { ...secret, cursor: sync.data.next_cursor || secret.cursor },
          { itemId: secret.itemId },
        )
        await markSyncOk(orgId, 'plaid')
        plaidOrgs.push(orgId)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`plaid:${orgId}:${message}`)
        await markSyncError(orgId, 'plaid', message)
      }
    }
  }

  const silent = await listSilentOrgs()
  if (silent.length) {
    await reportError(new Error(`Commons sync silence: ${silent.length} org(s)`), {
      route: '/api/cron/sync-commons-connectors',
      extra: { orgIds: silent.map((s) => s.organizationId) },
    })
  }

  return NextResponse.json({
    ok: errors.length === 0,
    squareOrgs: squareOrgs.length,
    plaidOrgs: plaidOrgs.length,
    silent: silent.length,
    errors,
  })
}
