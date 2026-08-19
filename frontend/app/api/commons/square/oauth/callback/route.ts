/**
 * GET /api/commons/square/oauth/callback
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { putConnector } from '@/lib/crm/connectors'
import { markSyncOk } from '@/lib/crm/sync-state'
import { exchangeSquareCode } from '@/lib/crm/square-oauth'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { publicSiteUrl } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

function parseState(state: string): string | null {
  const [orgId, sig] = state.split('.')
  if (!orgId || !sig) return null
  const secret = process.env.BETTER_AUTH_SECRET || process.env.DEMO_SIGNING_SECRET || ''
  const expected = createHmac('sha256', secret).update(orgId).digest('hex').slice(0, 24)
  if (expected !== sig) return null
  return orgId
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || ''
  const state = req.nextUrl.searchParams.get('state') || ''
  const staff = `${publicSiteUrl()}/staff`
  if (!code) return NextResponse.redirect(`${staff}?square=denied`)
  const orgId = parseState(state)
  if (!orgId) return NextResponse.redirect(`${staff}?square=bad_state`)
  try {
    await ensureCommonsReady()
    const secret = await exchangeSquareCode(code)
    await putConnector(orgId, 'square', secret, {
      merchantId: secret.merchantId,
      expiresAt: secret.expiresAt,
    })
    await markSyncOk(orgId, 'square')
    return NextResponse.redirect(`${staff}?square=connected`)
  } catch {
    return NextResponse.redirect(`${staff}?square=error`)
  }
}
