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
      const { normalizeMembershipTier } = await import('@/lib/staff/members-roster')
      const targetNorm = normalizeMembershipTier(tier)
      const match = tiers.find(
        (t) => normalizeMembershipTier(t.tierId) === targetNorm && t.active,
      )
      if (!match || match.price <= 0) {
        return NextResponse.json({ error: 'Unknown tier' }, { status: 404 })
      }

      const session = await getMemberSession(req)
      const effectiveForTier = await getEffectiveParentEmail(req)
      const tierEmail = effectiveForTier?.parentEmail ?? session?.email
      const currentTier = tierEmail ? await getParentHighestTier(tierEmail) : 'free'

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

      let coveDollars = 0
      let cardDollars = charge.amount
      let coveBalance = 0
      const effective = await getEffectiveParentEmail(req)
      const coveEmail = effective?.parentEmail ?? session?.email
      if (coveEmail) {
        const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
        const useCoveBalance = wantsCoveBalance(body.useCoveBalance)
        const split = await withCoveSplit(
          {
            kind: 'membership',
            amount: charge.amount,
            amountCents: Math.round(charge.amount * 100),
            description: match.name,
            customId: `membership:${tier}`,
            meta: { tier },
          },
          coveEmail,
          useCoveBalance,
        )
        coveDollars = Math.round(Number(split.meta.coveCents ?? 0) || 0) / 100
        cardDollars = Math.round(Number(split.meta.cardCents ?? split.amountCents) || 0) / 100
        coveBalance = Number(split.meta.coveBalance ?? 0) || 0
      }

      return NextResponse.json({
        kind,
        tier,
        name: match.name,
        amount: charge.amount,
        listPrice: charge.listPrice,
        currentListPrice: charge.currentListPrice,
        isUpgrade: charge.isUpgrade,
        currentTier: charge.currentTier,
        coveDollars,
        cardDollars,
        coveBalance,
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
      const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
      const productId = String(body.productId ?? '').trim()
      const variantId = String(body.variantId ?? '').trim()
      const couponCode = String(body.couponCode ?? '').trim() || null
      const useCoveBalance = wantsCoveBalance(body.useCoveBalance)
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
      const addonProgramIds = Array.isArray(body.addonProgramIds)
        ? body.addonProgramIds.map((id: unknown) => String(id ?? '').trim()).filter(Boolean)
        : []
      const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
      let resolved = await resolveCheckoutIntent(
        { kind: 'program', programId, studentId, couponCode, addonProgramIds },
        parentEmail,
        accountEmails,
      )
      resolved = await withCoveSplit(
        resolved,
        parentEmail,
        wantsCoveBalance(body.useCoveBalance),
      )
      const coveCents = Math.round(Number(resolved.meta.coveCents ?? 0) || 0)
      const cardCents = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0)
      return NextResponse.json({
        kind,
        programId,
        addonProgramIds,
        name: resolved.meta.addonProgramNames
          ? `${resolved.meta.programName} + ${resolved.meta.addonProgramNames}`
          : resolved.meta.programName,
        listAmount: Number(resolved.meta.listFee ?? resolved.amount),
        amount: resolved.amount,
        discountCode: resolved.meta.discountCode || '',
        discountPercent: Number(resolved.meta.memberDiscountPercent ?? 0) || 0,
        coveDollars: coveCents / 100,
        cardDollars: cardCents / 100,
        coveBalance: Number(resolved.meta.coveBalance ?? 0) || 0,
      })
    }

    if (kind === 'event') {
      const session = await getMemberSession(req)
      if (!session?.email) return NextResponse.json({ error: 'Log in to quote' }, { status: 401 })
      const { resolveCheckoutIntent } = await import('@/lib/checkout-fulfill')
      const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
      const eventId = String(body.eventId ?? '').trim()
      const quantity = Number(body.quantity ?? 1) || 1
      let resolved = await resolveCheckoutIntent(
        { kind: 'event', eventId, quantity },
        session.email,
      )
      resolved = await withCoveSplit(
        resolved,
        session.email,
        wantsCoveBalance(body.useCoveBalance),
      )
      const coveCents = Math.round(Number(resolved.meta.coveCents ?? 0) || 0)
      const cardCents = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0)
      return NextResponse.json({
        kind,
        eventId,
        amount: resolved.amount,
        name: resolved.meta.eventTitle || 'Event tickets',
        coveDollars: coveCents / 100,
        cardDollars: cardCents / 100,
        coveBalance: Number(resolved.meta.coveBalance ?? 0) || 0,
      })
    }

    if (kind === 'donation') {
      const session = await getMemberSession(req)
      const { isAllowedDonationAmount } = await import('@/lib/donation')
      const amountCents = Number(body.amountCents)
      const amount = amountCents / 100
      if (!Number.isInteger(amountCents) || !isAllowedDonationAmount(amount)) {
        return NextResponse.json(
          { error: 'Enter a donation between $1 and $10,000' },
          { status: 400 },
        )
      }
      let coveDollars = 0
      let cardDollars = amount
      let coveBalance = 0
      if (session?.email) {
        const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
        const split = await withCoveSplit(
          {
            kind: 'donation',
            amount,
            amountCents,
            description: 'PTO Donation',
            customId: `dn:${session.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 37)}`,
            meta: {},
          },
          session.email,
          wantsCoveBalance(body.useCoveBalance),
        )
        coveDollars = Math.round(Number(split.meta.coveCents ?? 0) || 0) / 100
        cardDollars = Math.round(Number(split.meta.cardCents ?? split.amountCents) || 0) / 100
        coveBalance = Number(split.meta.coveBalance ?? 0) || 0
      }
      return NextResponse.json({
        kind,
        amount,
        name: 'PTO Donation',
        coveDollars,
        cardDollars,
        coveBalance,
      })
    }

    if (kind === 'cart') {
      const session = await getMemberSession(req)
      if (!session) return NextResponse.json({ error: 'Log in to check out' }, { status: 401 })
      const effective = await getEffectiveParentEmail(req)
      const parentEmail = effective?.parentEmail ?? session.email
      const accountEmails = [
        effective?.actorEmail ?? session.email,
        ...session.emails,
      ]
      const cartLines = Array.isArray(body.cartLines) ? body.cartLines : []
      const { resolveCheckoutIntent } = await import('@/lib/checkout-fulfill')
      const { withCoveSplit, wantsCoveBalance } = await import('@/lib/checkout-cove-split')
      let resolved = await resolveCheckoutIntent(
        {
          kind: 'cart',
          cartLines,
          couponCode: String(body.couponCode ?? '').trim() || null,
        },
        parentEmail,
        accountEmails,
      )
      resolved = await withCoveSplit(
        resolved,
        parentEmail,
        wantsCoveBalance(body.useCoveBalance),
      )
      return NextResponse.json({
        kind,
        amount: resolved.amount,
        listAmount: resolved.amount,
        name: resolved.description,
        coveDollars: Math.round(Number(resolved.meta.coveCents ?? 0) || 0) / 100,
        cardDollars: Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0) / 100,
        coveBalance: Number(resolved.meta.coveBalance ?? 0) || 0,
      })
    }

    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  } catch (err) {
    console.error('/api/checkout/quote', err)
    const message = err instanceof Error ? err.message : 'Quote failed'
    const clientError =
      /discount|code|Product|Program|Choose|available|assigned|expired|used|open|required|Unknown/i.test(
        message,
      )
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 500 })
  }
}
