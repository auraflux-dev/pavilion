/**
 * POST /api/membership/claim
 * Logged-in parent confirms a paid membership purchase and applies tier to Students + gift card.
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
import { getPaidMembershipTiers } from '@/lib/api/membership'

async function findRecentPaidMembership(
  email: string
): Promise<{ tier: PaidTier; orderId?: string } | null> {
  try {
    const [cfg, cmsTiers] = await Promise.all([
      getCatalogConfig(),
      getPaidMembershipTiers(),
    ])
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
        const fromCms = cmsTiers.find((t) => t.productId && t.productId === catalogId)
        const tier =
          fromCms?.tierId ??
          tierFromProductId(catalogId, cfg) ??
          tierFromSlugOrName(name)
        if (tier) return { tier, orderId: order.id }
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
    const requestedTier = String(body.tier ?? '')
      .trim()
      .toLowerCase()
    const studentId = (body.studentId as string | undefined) || null
    const parentName =
      [member?.contact?.firstName, member?.contact?.lastName].filter(Boolean).join(' ') ||
      null

    const fromOrders = await findRecentPaidMembership(email)
    const tier =
      fromOrders?.tier ||
      (requestedTier && requestedTier !== 'faculty' && requestedTier !== 'free'
        ? requestedTier
        : null)

    if (!tier) {
      return NextResponse.json(
        {
          error:
            'No paid membership found yet. Finish checkout on the Wix page, wait a moment, then confirm again.',
        },
        { status: 404 }
      )
    }

    const result = await applyPaidMembership({
      parentEmail: email,
      tier,
      studentId,
      orderId: fromOrders?.orderId ?? null,
      parentName,
    })

    return NextResponse.json({
      ok: true,
      tier,
      verifiedFromOrders: !!fromOrders,
      ...result,
    })
  } catch (err) {
    console.error('/api/membership/claim error:', err)
    return NextResponse.json({ error: 'Failed to apply membership' }, { status: 500 })
  }
}
