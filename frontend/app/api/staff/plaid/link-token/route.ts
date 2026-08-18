/**
 * POST /api/staff/plaid/link-token
 * Create a Plaid Link token for treasurer/admin (Bank of America OAuth).
 */
import { NextRequest, NextResponse } from 'next/server'
import { DepositoryAccountSubtype } from 'plaid'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  getPlaidClient,
  plaidAxiosError,
  plaidConfigured,
  plaidCountryCodes,
  plaidLinkProducts,
  plaidRedirectUri,
  plaidWebhookUrl,
} from '@/lib/staff/plaid'
import { listActivePlaidItems } from '@/lib/staff/plaid-items'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!plaidConfigured()) {
    return NextResponse.json(
      { error: 'Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET on Vercel.' },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { update?: boolean }
  const items = await listActivePlaidItems()
  const updateToken = body.update ? items[0]?.accessToken : ''

  try {
    const client = getPlaidClient()
    const res = await client.linkTokenCreate({
      user: { client_user_id: 'shms-pto-budget' },
      client_name: 'SHMS PTO Staff',
      language: 'en',
      country_codes: plaidCountryCodes(),
      products: updateToken ? undefined : plaidLinkProducts(),
      access_token: updateToken || undefined,
      webhook: plaidWebhookUrl(),
      redirect_uri: plaidRedirectUri(),
      account_filters: {
        depository: {
          account_subtypes: [DepositoryAccountSubtype.Checking],
        },
      },
    })
    return NextResponse.json({
      link_token: res.data.link_token,
      expiration: res.data.expiration,
      redirect_uri: plaidRedirectUri(),
      update: Boolean(updateToken),
    })
  } catch (err) {
    const plaid = plaidAxiosError(err)
    console.error('plaid link-token', plaid || err)
    return NextResponse.json(
      { error: plaid?.message || (err instanceof Error ? err.message : 'Could not create Plaid Link token') },
      { status: 400 },
    )
  }
}
