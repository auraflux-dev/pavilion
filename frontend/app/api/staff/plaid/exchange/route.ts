/**
 * POST /api/staff/plaid/exchange
 * Swap Link public_token for an access_token and store the org BoA Item.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getPlaidClient, plaidAxiosError, plaidConfigured } from '@/lib/staff/plaid'
import { upsertPlaidItem } from '@/lib/staff/plaid-items'
import { refreshPlaidIntoBudget } from '@/lib/staff/plaid-sync'
import { DEFAULT_FISCAL_YEAR } from '@/lib/staff/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    public_token?: string
    institution?: { institution_id?: string; name?: string }
    accounts?: Array<{ mask?: string; name?: string }>
  }
  const publicToken = String(body.public_token ?? '').trim()
  if (!publicToken) return NextResponse.json({ error: 'public_token required' }, { status: 400 })

  try {
    const client = getPlaidClient()
    const exchanged = await client.itemPublicTokenExchange({ public_token: publicToken })
    const checking = body.accounts?.[0]
    await upsertPlaidItem({
      itemId: exchanged.data.item_id,
      accessToken: exchanged.data.access_token,
      institutionId: body.institution?.institution_id,
      institutionName: body.institution?.name || 'Bank of America',
      connectedByEmail: session!.email,
      accountMask: checking?.mask,
      accountName: checking?.name,
      cursor: '',
      error: '',
      active: true,
    })

    let sync: { added: number; message?: string } | null = null
    try {
      sync = await refreshPlaidIntoBudget({
        fiscalYear: DEFAULT_FISCAL_YEAR,
        actorEmail: session!.email,
      })
    } catch (err) {
      const plaid = plaidAxiosError(err)
      sync = { added: 0, message: plaid?.message || (err instanceof Error ? err.message : 'Connected; refresh in a minute.') }
    }

    return NextResponse.json({
      ok: true,
      item_id: exchanged.data.item_id,
      added: sync?.added ?? 0,
      message: sync?.message,
    })
  } catch (err) {
    const plaid = plaidAxiosError(err)
    console.error('plaid exchange', plaid || err)
    return NextResponse.json(
      { error: plaid?.message || (err instanceof Error ? err.message : 'Could not connect bank') },
      { status: 400 },
    )
  }
}
