/**
 * GET /api/staff/plaid/status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { plaidConfigured, plaidEnvName, plaidRedirectUri } from '@/lib/staff/plaid'
import { listActivePlaidItems, publicPlaidStatus } from '@/lib/staff/plaid-items'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const items = plaidConfigured() ? await listActivePlaidItems() : []
  return NextResponse.json({
    configured: plaidConfigured(),
    env: plaidEnvName(),
    redirectUri: plaidRedirectUri(),
    ...publicPlaidStatus(items),
  })
}
