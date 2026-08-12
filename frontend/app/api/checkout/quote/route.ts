/**
 * POST /api/checkout/quote. price check before opening card form.
 * Membership quotes use upgrade delta when the parent already has a lower paid tier.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import {
  fetchCatalogProductDetail,
  fetchCatalogVariantPrice,
} from '@/lib/catalog-price'
import { getMemberSession } from '@/lib/auth-member'
import {
  getParentHighestTier,
  membershipChargeDollars,
} from '@/lib/membership-pricing'
import { tierRank } from '@/lib/staff/members-roster'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const kind = body.kind as string

    if (kind === 'membership') {
      const tier = String(body.tier ?? '').trim().toLowerCase()
      const tiers = await getPaidMembershipTiers()
      const match = tiers.find((t) => t.tierId === tier && t.active)
      if (!match || match.price <= 0) {
        return NextResponse.json({ error: 'Unknown tier' }, { status: 404 })
      }

      const session = await getMemberSession(req)
      const currentTier = session?.email
        ? await getParentHighestTier(session.email)
        : 'free'

      if (
        tierRank(currentTier) >= tierRank(tier) &&
        tierRank(currentTier) > 0
      ) {
        return NextResponse.json(
          {
            error: `You already have ${currentTier} membership. Choose a higher tier to upgrade.`,
            currentTier,
          },
          { status: 409 },
        )
      }

      const charge = membershipChargeDollars({
        targetTier: tier,
        currentTier,
        tiers,
      })
      if (charge.amount <= 0) {
        return NextResponse.json(
          { error: 'Nothing to charge for this upgrade' },
          { status: 400 },
        )
      }

      return NextResponse.json({
        kind,
        tier,
        name: match.name,
        amount: charge.amount,
        listPrice: charge.listPrice,
        isUpgrade: charge.isUpgrade,
        currentTier: charge.currentTier,
      })
    }

    if (kind === 'product') {
      const productId = String(body.productId ?? '').trim()
      const variantId = String(body.variantId ?? '').trim()
      const cfg = await getCatalogConfig()
      const allowed = new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds])
      if (!productId || !allowed.has(productId)) {
        return NextResponse.json({ error: 'Product not available' }, { status: 404 })
      }
      if (variantId) {
        const variant = await fetchCatalogVariantPrice(productId, variantId)
        if (!variant) return NextResponse.json({ error: 'Price unavailable' }, { status: 404 })
        return NextResponse.json({
          kind,
          productId,
          variantId,
          name: variant.name,
          variantLabel: variant.variantLabel,
          amount: variant.price,
        })
      }
      const detail = await fetchCatalogProductDetail(productId)
      if (!detail) return NextResponse.json({ error: 'Price unavailable' }, { status: 404 })
      if (detail.variants.length > 1) {
        return NextResponse.json(
          { error: 'Choose a color or size before checkout' },
          { status: 400 },
        )
      }
      return NextResponse.json({
        kind,
        productId,
        name: detail.name,
        amount: detail.variants[0]?.price ?? detail.price,
      })
    }

    if (kind === 'donation') {
      const { isAllowedDonationAmount } = await import('@/lib/donation')
      const amountCents = Number(body.amountCents)
      const amount = amountCents / 100
      if (!Number.isInteger(amountCents) || !isAllowedDonationAmount(amount)) {
        return NextResponse.json(
          { error: 'Enter a donation between $1 and $10,000' },
          { status: 400 },
        )
      }
      return NextResponse.json({
        kind,
        amount,
        name: 'PTO Donation',
      })
    }

    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  } catch (err) {
    console.error('/api/checkout/quote', err)
    return NextResponse.json({ error: 'Quote failed' }, { status: 500 })
  }
}
