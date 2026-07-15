/**
 * GET /api/cron/sync-membership-orders
 * Vercel Cron + manual ops: scan recent paid Wix orders and apply Ruby/Supreme.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron sends this automatically)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, ApiKeyStrategy } from '@wix/sdk'
import { orders } from '@wix/ecom'
import {
  applyPaidMembership,
  tierFromProductId,
  tierFromSlugOrName,
  type PaidTier,
} from '@/lib/membership-sync'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import type { CatalogConfig } from '@/lib/defaults/catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

function tierFromLineItem(
  li: Record<string, unknown>,
  cfg: CatalogConfig
): PaidTier | null {
  const catalog = li.catalogReference as { catalogItemId?: string } | undefined
  const catalogId = catalog?.catalogItemId
  const name = String(
    (li.productName as { original?: string } | undefined)?.original ??
      li.productName ??
      li.name ??
      ''
  )
  return tierFromProductId(catalogId, cfg) ?? tierFromSlugOrName(name)
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
        cursorPaging: { limit: 50 },
        sort: [{ fieldName: 'dateCreated', order: 'DESC' }],
      },
    })

    const applied: { email: string; tier: PaidTier; orderId?: string }[] = []
    const skipped: string[] = []

    for (const order of result.orders ?? []) {
      const pay = String(order.paymentStatus ?? '').toUpperCase()
      if (pay && !pay.includes('PAID') && pay !== 'FULLY_PAID' && pay !== 'APPROVED') {
        skipped.push(`${order.id}:payment`)
        continue
      }

      let tier: PaidTier | null = null
      for (const li of order.lineItems ?? []) {
        tier = tierFromLineItem(li, cfg)
        if (tier) break
      }
      if (!tier) {
        skipped.push(`${order.id}:product`)
        continue
      }

      const email = String(order.buyerInfo?.email ?? '')
        .trim()
        .toLowerCase()
      if (!email) {
        skipped.push(`${order.id}:email`)
        continue
      }

      await applyPaidMembership({ parentEmail: email, tier })
      applied.push({ email, tier, orderId: order.id })
    }

    return NextResponse.json({
      ok: true,
      scanned: (result.orders ?? []).length,
      applied,
      skippedCount: skipped.length,
    })
  } catch (err) {
    console.error('sync-membership-orders cron error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
