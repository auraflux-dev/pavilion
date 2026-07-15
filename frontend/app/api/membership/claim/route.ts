/**
 * POST /api/membership/claim
 * Logged-in parent confirms a paid membership purchase and applies tier to Students.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient } from '@/lib/wix-oauth-client'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'
import {
  applyPaidMembership,
  tierFromProductId,
  tierFromSlugOrName,
  type PaidTier,
} from '@/lib/membership-sync'
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { orders } from '@wix/ecom'
import { getCatalogConfig } from '@/lib/api/catalog-config'

async function findRecentPaidTier(email: string): Promise<PaidTier | null> {
  try {
    const cfg = await getCatalogConfig()
    const client = createClient({
      modules: { orders },
      auth: ApiKeyStrategy({
        siteId: process.env.WIX_SITE_ID!,
        apiKey: process.env.WIX_API_KEY!,
      }),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (client.orders as any).searchOrders({
      search: {
        filter: { 'buyerInfo.email': email },
        cursorPaging: { limit: 25 },
      },
    })

    for (const order of result.orders ?? []) {
      const pay = String(order.paymentStatus ?? '').toUpperCase()
      if (pay && !pay.includes('PAID') && pay !== 'FULLY_PAID' && pay !== 'APPROVED') {
        continue
      }
      for (const li of order.lineItems ?? []) {
        const catalogId = li.catalogReference?.catalogItemId as string | undefined
        const name = String(li.productName?.original ?? li.productName ?? '')
        const tier =
          tierFromProductId(catalogId, cfg) ?? tierFromSlugOrName(name)
        if (tier) return tier
      }
    }
  } catch (err) {
    console.warn('membership claim: order lookup failed', err)
  }
  return null
}

export async function POST(req: NextRequest) {
  const tokens = parseTokensCookie(req.cookies.get(TOKENS_COOKIE)?.value)
  if (!tokens || !isMemberTokens(tokens)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const oauth = createOAuthClient(tokens)
    const { member } = await oauth.members.getCurrentMember({ fieldsets: ['FULL'] })
    const email = (member?.loginEmail ?? '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const requestedTier =
      body.tier === 'supreme' || body.tier === 'ruby' ? (body.tier as PaidTier) : null
    const studentId = (body.studentId as string | undefined) || null

    const fromOrders = await findRecentPaidTier(email)
    const tier = fromOrders ?? requestedTier

    if (!tier) {
      return NextResponse.json(
        {
          error:
            'No Ruby/Supreme membership found yet. Finish checkout on the Wix page, wait a moment, then confirm again.',
        },
        { status: 404 }
      )
    }

    const result = await applyPaidMembership({
      parentEmail: email,
      tier,
      studentId,
    })

    return NextResponse.json({ ok: true, tier, verifiedFromOrders: !!fromOrders, ...result })
  } catch (err) {
    console.error('/api/membership/claim error:', err)
    return NextResponse.json({ error: 'Failed to apply membership' }, { status: 500 })
  }
}
