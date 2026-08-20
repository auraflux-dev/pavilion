/**
 * POST /api/checkout/quote. price check before opening card form.
 * Membership quotes use upgrade delta when the parent already has a lower paid tier.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import { getMemberSession } from '@/lib/auth-member'
import { getEffectiveParentEmail } from '@/lib/staff/session'
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
      const effective = await getEffectiveParentEmail(req)
      if (!effective) return NextResponse.json({ error: 'Log in to quote' }, { status: 401 })
      const parentEmail = effective.parentEmail
      const accountEmails = [
        effective.actorEmail,
        ...effective.session.emails,
      ]
      const { resolveCheckoutIntent } = await import('@/lib/checkout-fulfill')
      const { withCoveSplit } = await import('@/lib/checkout-cove-split')
      const productId = String(body.productId ?? '').trim()
      const variantId = String(body.variantId ?? '').trim()
      const couponCode = String(body.couponCode ?? '').trim() || null
      const useCoveBalance = body.useCoveBalance !== false
      let resolved = await resolveCheckoutIntent(
        { kind: 'product', productId, variantId, couponCode },
        parentEmail,
        accountEmails,
      )
      resolved = await withCoveSplit(resolved, parentEmail, useCoveBalance)
      const coveCents = Math.round(Number(resolved.meta.coveCents ?? 0) || 0)
      const cardCents = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0)
      return NextResponse.json({
        kind,
        productId,
        name: resolved.meta.productName,
        listAmount: Number(resolved.meta.listPrice ?? resolved.amount),
        amount: resolved.amount,
        discountCode: resolved.meta.discountCode || '',
        discountPercent: Number(resolved.meta.discountPercent ?? 0) || 0,
        coveDollars: coveCents / 100,
        cardDollars: cardCents / 100,
        coveBalance: Number(resolved.meta.coveBalance ?? 0) || 0,
      })
    }

    if (kind === 'program') {
      const effective = await getEffectiveParentEmail(req)
      if (!effective) return NextResponse.json({ error: 'Log in to quote' }, { status: 401 })
      const parentEmail = effective.parentEmail
      const accountEmails = [
        effective.actorEmail,
        ...effective.session.emails,
      ]
      const { resolveCheckoutIntent } = await import('@/lib/checkout-fulfill')
      const programId = String(body.programId ?? '').trim()
      const studentId = String(body.studentId ?? '').trim()
      const couponCode = String(body.couponCode ?? '').trim() || null
      const resolved = await resolveCheckoutIntent(
        { kind: 'program', programId, studentId, couponCode },
        parentEmail,
        accountEmails,
      )
      return NextResponse.json({
        kind,
        programId,
        name: resolved.meta.programName,
        listAmount: Number(resolved.meta.listFee ?? resolved.amount),
        amount: resolved.amount,
        discountCode: resolved.meta.discountCode || '',
        discountPercent: Number(resolved.meta.memberDiscountPercent ?? 0) || 0,
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
