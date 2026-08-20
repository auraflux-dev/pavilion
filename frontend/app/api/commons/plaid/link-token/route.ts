/**
 * POST /api/commons/plaid/link-token. Plaid Link for this organization (not SHMS Wix items).
 */
import { NextRequest, NextResponse } from 'next/server'
import { DepositoryAccountSubtype } from 'plaid'
import { isSameOriginRequest } from '@/lib/security/csrf'
import { commonsDbEnabled } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { getConnector, type PlaidConnectorSecret } from '@/lib/crm/connectors'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import {
  getPlaidClient,
  plaidAxiosError,
  plaidConfigured,
  plaidCountryCodes,
  plaidLinkProducts,
  plaidRedirectUri,
} from '@/lib/staff/plaid'
import { isDemoInstance, publicSiteUrl } from '@/lib/demo/instance'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!commonsDbEnabled()) {
    return NextResponse.json({ error: 'Commons database is not configured' }, { status: 503 })
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: 'PLAID_CLIENT_ID / PLAID_SECRET are not set' }, { status: 503 })
  }
  try {
    await ensureCommonsReady()
    const orgId = await organizationIdFromRequest(req)
    const existing = await getConnector<PlaidConnectorSecret>(orgId, 'plaid')
    const body = (await req.json().catch(() => ({}))) as { update?: boolean }
    const updateToken = body.update ? existing?.accessToken : ''
    const client = getPlaidClient()
    const webhook =
      process.env.COMMONS_PLAID_WEBHOOK_URL?.trim() ||
      `${publicSiteUrl()}/api/webhooks/commons-plaid`
    const res = await client.linkTokenCreate({
      user: { client_user_id: orgId },
      client_name: isDemoInstance() ? 'Commons PTO' : 'PTO Staff',
      language: 'en',
      country_codes: plaidCountryCodes(),
      products: updateToken ? undefined : plaidLinkProducts(),
      access_token: updateToken || undefined,
      webhook,
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
      update: Boolean(updateToken),
    })
  } catch (err) {
    if (err instanceof MissingOrganizationIdError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const plaid = plaidAxiosError(err)
    return NextResponse.json(
      { error: plaid?.message || (err instanceof Error ? err.message : 'Plaid Link failed') },
      { status: 400 },
    )
  }
}
