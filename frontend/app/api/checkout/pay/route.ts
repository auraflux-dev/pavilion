/**
 * POST /api/checkout/pay
 * In-portal Square card charge for any ecommerce: membership | product | store-card.
 * Free and paid members (logged in) can pay with their own CC. saved card is optional.
 */
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import {
  findStoredPaymentMethod,
  upsertStoredPaymentMethod,
} from '@/lib/stored-payment-methods'
import { getCatalogConfig, isAllowedStoreCardLoadAmount } from '@/lib/api/catalog-config'
import { getPaidMembershipTiers } from '@/lib/api/membership'

import { applyPaidMembership } from '@/lib/membership-sync'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import { getWixClient } from '@/lib/wix-client'
import {
  chargePayment,
  createCardOnFile,
  createOrLoadStudentGiftCard,
  loadGiftCard,
  refundPayment,
  upsertSquareCustomer,
} from '@/lib/square'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  getStoreCardBonusPercent,
  resolveParentLoadBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'
import {
  recordConsentAcknowledgments,
  validateConsentAcks,
  type ConsentAck,
  type CheckoutConsentKind,
} from '@/lib/checkout-consent'

type Kind = 'membership' | 'product' | 'store-card' | 'program' | 'event' | 'donation'

type StudentRow = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  squareGiftCardGan?: string
  archived?: boolean
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Log in to pay' }, { status: 401 })

  try {
    const body = await req.json()
    const kind = body.kind as Kind
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId : undefined
    const useStoredCard = Boolean(body.useStoredCard)
    const saveCard = Boolean(body.saveCard)
    const consents = body.consents as ConsentAck[] | undefined

    if (!kind || !['membership', 'product', 'store-card', 'program', 'event', 'donation'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const consentCheck = validateConsentAcks(kind as CheckoutConsentKind, consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    let name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    const bodyFirst = String(body.firstName ?? '').trim()
    const bodyLast = String(body.lastName ?? '').trim()
    if ((!name || bodyFirst || bodyLast) && bodyFirst && bodyLast) {
      try {
        await session.oauthClient.members.updateMember(session.memberId, {
          contact: { firstName: bodyFirst, lastName: bodyLast },
        } as Parameters<typeof session.oauthClient.members.updateMember>[1])
        name = `${bodyFirst} ${bodyLast}`
      } catch (err) {
        console.error('checkout pay: could not save parent name', err)
        return NextResponse.json(
          { error: 'Could not save your name. Try again or update My Account.' },
          { status: 502 },
        )
      }
    }
    if (!name || !/\s/.test(name)) {
      return NextResponse.json(
        {
          error: 'Enter your first and last name before paying.',
          errorCode: 'parentNameRequired',
        },
        { status: 400 },
      )
    }
    const client = getWixClient()
    const effective = await getEffectiveParentEmail(req)
    const householdEmail = await resolvePrimaryParentEmail(
      effective?.parentEmail ?? session.email,
    )
    let stored = await findStoredPaymentMethod(householdEmail)
    let paymentSource = sourceId
    let customerId = stored?.squareCustomerId

    if (useStoredCard) {
      if (!stored?.squareCardId || !stored.squareCustomerId) {
        return NextResponse.json({ error: 'No saved card on file. enter your card below' }, { status: 400 })
      }
      paymentSource = stored.squareCardId
      customerId = stored.squareCustomerId
    } else if (saveCard) {
      if (!sourceId) return NextResponse.json({ error: 'Card details required' }, { status: 400 })
      const customer = await upsertSquareCustomer(householdEmail, name || householdEmail)
      if (!customer?.id) throw new Error('Could not create Square customer')
      const card = await createCardOnFile({
        sourceId,
        customerId: customer.id,
        referenceId: session.memberId,
        idempotencyKey: randomUUID(),
      })
      if (!card?.id) throw new Error('Could not save card')
      paymentSource = card.id
      customerId = customer.id
      stored = await upsertStoredPaymentMethod(householdEmail, {
        wixMemberId: session.memberId,
        squareCustomerId: customer.id,
        squareCardId: card.id,
        brand: String(card.cardBrand ?? 'Card'),
        last4: card.last4 ?? '',
        expMonth: card.expMonth ? Number(card.expMonth) : null,
        expYear: card.expYear ? Number(card.expYear) : null,
      })
    }

    if (!paymentSource) {
      paymentSource = undefined
    }

    // ── Enrichment program ──────────────────────────────────────
    if (kind === 'program') {
      const effective = await getEffectiveParentEmail(req)
      const parentEmail = effective?.parentEmail ?? session.email
      const accountEmails = [
        effective?.actorEmail ?? session.email,
        ...session.emails,
      ]
      const { resolveCheckoutIntent, fulfillPaidCheckout } = await import('@/lib/checkout-fulfill')
      const programId = String(body.programId ?? '').trim()
      const studentId = String(body.studentId ?? '').trim()
      const couponCode = String(body.couponCode ?? '').trim() || null
      const resolved = await resolveCheckoutIntent(
        { kind: 'program', programId, studentId, couponCode },
        parentEmail,
        accountEmails,
      )
      if (!paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card to pay' },
          { status: 400 }
        )
      }
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents: resolved.amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: resolved.customId,
        buyerEmailAddress: session.email,
        note: resolved.description,
      })
      const result = await fulfillPaidCheckout({
        resolved,
        parentEmail,
        parentName: name,
        transactionId: payment.id ?? paymentKey,
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        sourcePrefix: 'square',
        consents: consentCheck.acks,
      })
      return NextResponse.json({ ok: true, ...result })
    }

    // ── Event tickets ───────────────────────────────────────────
    if (kind === 'event') {
      if (!paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card to pay' },
          { status: 400 }
        )
      }
      const { resolveCheckoutIntent, fulfillPaidCheckout } = await import('@/lib/checkout-fulfill')
      const eventId = String(body.eventId ?? '').trim()
      const quantity = Number(body.quantity ?? 1) || 1
      const resolved = await resolveCheckoutIntent(
        { kind: 'event', eventId, quantity },
        session.email,
      )
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents: resolved.amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: resolved.customId,
        buyerEmailAddress: session.email,
        note: resolved.description,
      })
      const result = await fulfillPaidCheckout({
        resolved,
        parentEmail: session.email,
        parentName: name,
        transactionId: payment.id ?? paymentKey,
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        sourcePrefix: 'square',
        consents: consentCheck.acks,
      })
      return NextResponse.json({ ok: true, ...result })
    }

    // ── Membership ──────────────────────────────────────────────
    if (kind === 'membership') {
      if (!paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card to pay' },
          { status: 400 }
        )
      }
      const tier = String(body.tier ?? '').trim().toLowerCase()
      const studentId = typeof body.studentId === 'string' ? body.studentId : null
      const shirtSize = typeof body.shirtSize === 'string' ? body.shirtSize.trim() : ''
      const shirtDesign = typeof body.shirtDesign === 'string' ? body.shirtDesign.trim() : ''
      const shirtProductId =
        typeof body.shirtProductId === 'string' ? body.shirtProductId.trim() : ''
      const shirtVariantId =
        typeof body.shirtVariantId === 'string' ? body.shirtVariantId.trim() : ''
      const {
        tierOffersPhysicalPerkChoice,
        tierNeedsShirtSize,
        parsePhysicalPerk,
      } = await import('@/lib/membership-entitlements')
      const physicalPerk = parsePhysicalPerk(
        typeof body.physicalPerk === 'string' ? body.physicalPerk : null,
      )
      const needsShirt =
        (tierOffersPhysicalPerkChoice(tier) && physicalPerk === 'spirit_shirt') ||
        (!tierOffersPhysicalPerkChoice(tier) && tierNeedsShirtSize(tier))

      // Faculty: magnet OR shirt. Parents Lagoon/Tide: shirt (they get shirt + magnet).
      if (tierOffersPhysicalPerkChoice(tier)) {
        if (!physicalPerk) {
          return NextResponse.json(
            { error: 'Choose your faculty perk: Stone Hill car magnet or Spirit Wear T-shirt.' },
            { status: 400 },
          )
        }
      }

      if (needsShirt) {
        const { isMembershipShirtDesignsEnabled, assertMembershipShirtAvailable } =
          await import('@/lib/membership-shirt')
        const designsEnabled = await isMembershipShirtDesignsEnabled()
        if (designsEnabled) {
          if (!shirtVariantId || !shirtProductId) {
            return NextResponse.json(
              { error: 'Select a Spirit Wear design and size for this membership.' },
              { status: 400 },
            )
          }
          try {
            await assertMembershipShirtAvailable({
              productId: shirtProductId,
              variantId: shirtVariantId,
            })
          } catch (err) {
            return NextResponse.json(
              {
                error:
                  err instanceof Error
                    ? err.message
                    : 'That shirt design/size is no longer available.',
              },
              { status: 409 },
            )
          }
        } else if (!shirtSize) {
          return NextResponse.json(
            { error: 'Select a Spirit Wear T-shirt size for this membership.' },
            { status: 400 },
          )
        }
      }
      const tiers = await getPaidMembershipTiers()
      const match = tiers.find((t) => t.tierId === tier && t.active)
      if (!match || match.price <= 0) {
        return NextResponse.json({ error: 'Unknown membership tier' }, { status: 400 })
      }

      const { getParentHighestTier, membershipChargeDollars, formatTierLabel } =
        await import('@/lib/membership-pricing')
      const { tierRank, normalizeMembershipTier } = await import(
        '@/lib/staff/members-roster'
      )
      const currentTier = await getParentHighestTier(session.email)
      if (
        tierRank(currentTier) >= tierRank(normalizeMembershipTier(tier)) &&
        tierRank(currentTier) > 0
      ) {
        return NextResponse.json(
          {
            error: `You already have ${formatTierLabel(currentTier)} membership. Choose a higher tier to upgrade.`,
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

      const amountCents = Math.round(charge.amount * 100)
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: `membership:${tier}`,
        buyerEmailAddress: session.email,
        note: charge.isUpgrade
          ? `SHMS PTO membership upgrade: ${formatTierLabel(currentTier)} → ${match.name}`
          : `SHMS PTO membership: ${match.name}`,
      })

      const applied = await applyPaidMembership({
        parentEmail: session.email,
        tier,
        studentId,
        orderId: payment.id ?? paymentKey,
        parentName: name || null,
        shirtSize: needsShirt ? shirtSize || null : null,
        shirtDesign: needsShirt ? shirtDesign || null : null,
        shirtProductId: needsShirt ? shirtProductId || null : null,
        shirtVariantId: needsShirt ? shirtVariantId || null : null,
        physicalPerk: physicalPerk || null,
      })

      const membershipStudentId =
        studentId ||
        applied.updatedStudentIds?.[0] ||
        applied.giftCard?.studentId ||
        null

      await client.items.insert('Payments', {
        programName: charge.isUpgrade
          ? `Membership upgrade: ${formatTierLabel(currentTier)} → ${match.name}`
          : `Membership: ${match.name}`,
        amount: charge.amount,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_membership',
        parentEmail: session.email,
        ...(membershipStudentId ? { studentId: membershipStudentId } : {}),
        notes: charge.isUpgrade
          ? `List $${charge.listPrice}; charged upgrade delta $${charge.amount}`
          : undefined,
      })

      await recordConsentAcknowledgments({
        parentEmail: session.email,
        kind: 'membership',
        transactionId: payment.id ?? paymentKey,
        studentId,
        acks: consentCheck.acks,
      })

      const { sendPurchaseConfirmation } = await import('@/lib/purchase-confirmation')
      let confirmation: Record<string, unknown> | undefined
      try {
        const conf = await sendPurchaseConfirmation({
          kind: 'membership',
          parentEmail: session.email,
          parentName: name,
          amount: charge.amount,
          description: charge.isUpgrade
            ? `Membership upgrade: ${formatTierLabel(currentTier)} → ${match.name}`
            : `Membership: ${match.name}`,
          transactionId: payment.id ?? paymentKey,
          meta: {
            tier,
            tierName: match.name,
            ...(charge.isUpgrade ? { isUpgrade: '1', currentTier } : {}),
            ...(shirtSize ? { shirtSize } : {}),
            ...(shirtDesign ? { shirtDesign } : {}),
            ...(shirtProductId ? { shirtProductId } : {}),
            ...(shirtVariantId ? { shirtVariantId } : {}),
            ...(physicalPerk ? { physicalPerk } : {}),
          },
        })
        confirmation = {
          subject: conf.subject,
          nextSteps: conf.nextSteps,
          portalHref: conf.portalHref,
          emailed: conf.emailed,
        }
      } catch (err) {
        console.warn('membership confirmation failed', err)
      }

      return NextResponse.json({
        ok: true,
        kind,
        paymentId: payment.id,
        tier,
        amount: charge.amount,
        isUpgrade: charge.isUpgrade,
        applied,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
        confirmation,
      })
    }

    // ── Cove / spirit product ───────────────────────────────────
    if (kind === 'product') {
      const effective = await getEffectiveParentEmail(req)
      const parentEmail = effective?.parentEmail ?? session.email
      const accountEmails = [
        effective?.actorEmail ?? session.email,
        ...session.emails,
      ]
      const { resolveCheckoutIntent, fulfillPaidCheckout } = await import('@/lib/checkout-fulfill')
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
      const cardCents = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0)
      const coveCents = Math.round(Number(resolved.meta.coveCents ?? 0) || 0)
      if (cardCents > 0 && cardCents < 100) {
        return NextResponse.json(
          { error: 'Remaining card amount is under $1. Pay the full amount by card, or load more on your Cove Digital Card.' },
          { status: 400 },
        )
      }
      if (cardCents >= 100 && !paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card for the remaining balance.' },
          { status: 400 },
        )
      }
      const paymentKey = randomUUID()
      let paymentId = paymentKey
      if (cardCents >= 100 && paymentSource) {
        try {
          const payment = await chargePayment({
            sourceId: paymentSource,
            amountCents: cardCents,
            idempotencyKey: paymentKey,
            customerId,
            referenceId: resolved.customId,
            buyerEmailAddress: session.email,
            note: resolved.description,
          })
          paymentId = payment.id ?? paymentKey
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Card payment failed' },
            { status: 400 },
          )
        }
      }
      try {
        const result = await fulfillPaidCheckout({
          resolved,
          parentEmail,
          parentName: name,
          transactionId: paymentId,
          paymentMethod:
            cardCents <= 0
              ? 'Cove Digital Card'
              : useStoredCard || saveCard
                ? 'Square Card on File'
                : 'Square Card',
          sourcePrefix: 'square',
          consents: consentCheck.acks,
        })
        return NextResponse.json({
          ok: true,
          ...result,
          coveCents,
          cardCents,
        })
      } catch (err) {
        if (cardCents >= 100) {
          await refundPayment({
            paymentId,
            amountCents: cardCents,
            idempotencyKey: `${paymentKey}-refund`.slice(0, 45),
          }).catch((refundErr) => {
            console.error('checkout/pay product refund after fulfill fail', refundErr)
          })
        }
        throw err
      }
    }

    // ── PTO donation (any amount) ───────────────────────────────
    if (kind === 'donation') {
      if (!paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card to pay' },
          { status: 400 }
        )
      }
      const { isAllowedDonationAmount } = await import('@/lib/donation')
      const amountCents = Number(body.amountCents)
      const amount = amountCents / 100
      if (!Number.isInteger(amountCents) || !isAllowedDonationAmount(amount)) {
        return NextResponse.json(
          { error: 'Enter a donation between $1 and $10,000' },
          { status: 400 },
        )
      }
      const note = String(body.note ?? '').trim().slice(0, 120)
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: `dn:${session.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 37)}`,
        buyerEmailAddress: session.email,
 note: note ? `PTO donation: ${note}` : 'SHMS PTO donation',
      })

      await client.items.insert('Payments', {
        programName: 'PTO Donation',
        amount,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_donation',
        parentEmail: session.email,
        notes: note || 'General PTO donation',
      })

      const { sendPurchaseConfirmation } = await import('@/lib/purchase-confirmation')
      let confirmation: Record<string, unknown> | undefined
      try {
        const conf = await sendPurchaseConfirmation({
          kind: 'donation',
          parentEmail: session.email,
          parentName: name,
          amount,
          description: 'SHMS PTO donation',
          transactionId: payment.id ?? paymentKey,
          meta: { note },
        })
        confirmation = {
          subject: conf.subject,
          nextSteps: conf.nextSteps,
          portalHref: conf.portalHref,
          emailed: conf.emailed,
        }
      } catch (err) {
        console.warn('donation confirmation failed', err)
      }

      return NextResponse.json({
        ok: true,
        kind,
        paymentId: payment.id,
        amount,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
        confirmation,
      })
    }

    // ── Family Cove Digital Card load / reload ──────────────────────────
    if (kind === 'store-card') {
      if (!paymentSource) {
        return NextResponse.json(
          { error: 'Enter your credit or debit card to pay' },
          { status: 400 }
        )
      }
    const studentId = String(body.studentId ?? '').trim()
    const amountCents = Number(body.amountCents)
    const amount = amountCents / 100
    const cfg = await getCatalogConfig()
    if (!Number.isInteger(amountCents) || !isAllowedStoreCardLoadAmount(amount, cfg)) {
      return NextResponse.json(
        {
          error: `Invalid amount (use whole dollars ${cfg.storeCardMinAmount} to ${cfg.storeCardMaxAmount})`,
        },
        { status: 400 }
      )
    }

    const family = await listFamilyStudents(session.email)
    if (family.length === 0) {
      return NextResponse.json(
        { error: 'Add a student before loading the family Cove Digital Card.' },
        { status: 400 }
      )
    }
    const student =
      (studentId ? family.find((s) => s._id === studentId) : undefined) ?? family[0]
    if (!student?._id) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    const familyCard = resolveFamilyGiftCard(family)

    const paymentKey = randomUUID()
    const payment = await chargePayment({
      sourceId: paymentSource,
      amountCents,
      idempotencyKey: paymentKey,
      customerId,
      referenceId: `sc:${session.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 37)}`,
      buyerEmailAddress: session.email,
      note: 'SHMS PTO family Cove Digital Card load',
    })

    try {
      const settings = await getSiteSettings()
      const configuredBonus = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
      const bonusPercent = await resolveParentLoadBonusPercent(session.email, configuredBonus)
      const loadCents = storeCardLoadCents(amountCents, bonusPercent)
      const isFirstLoad = bonusPercent > 0

      let gan = familyCard.gan
      let giftCardId = familyCard.giftCardId
      let activity: Awaited<ReturnType<typeof loadGiftCard>> | null = null
      let newBalance: number | null = null

      if (!gan) {
        const card = await createOrLoadStudentGiftCard({
          amountCents: loadCents,
          idempotencyKey: `first-load-${payment.id ?? paymentKey}`.slice(0, 45),
          customerId,
          buyerPaymentInstrumentIds: [payment.id ?? paymentKey],
        })
        gan = card.gan
        giftCardId = card.giftCardId
        newBalance = loadCents / 100
      } else {
        activity = await loadGiftCard(
          gan,
          loadCents,
          `reload-${payment.id ?? paymentKey}`.slice(0, 45),
          [payment.id ?? paymentKey]
        )
        newBalance = activity?.giftCardBalanceMoney
          ? Number(activity.giftCardBalanceMoney.amount) / 100
          : familyCard.balance + loadCents / 100
      }

      await syncFamilyStoreCard({
        parentEmail: session.email,
        gan,
        giftCardId,
        balanceDollars: newBalance ?? loadCents / 100,
      })

      await client.items.insert('Payments', {
        studentId: student._id,
        parentEmail: session.email,
        programName: isFirstLoad
          ? `Family Cove Digital Card First Load (+${bonusPercent}% bonus)`
          : 'Family Cove Digital Card Reload',
        amount,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_store_card_reload',
        notes:
          bonusPercent > 0
            ? `Paid $${amount}; loaded $${(loadCents / 100).toFixed(2)} (+${bonusPercent}%) on the Cove Digital Card`
            : 'Family Cove Digital Card load',
      })

      const { sendPurchaseConfirmation } = await import('@/lib/purchase-confirmation')
      let confirmation: Record<string, unknown> | undefined
      try {
        const conf = await sendPurchaseConfirmation({
          kind: 'store-card',
          parentEmail: session.email,
          parentName: name,
          amount,
          description: isFirstLoad
            ? `Family Cove Digital Card First Load (+${bonusPercent}% bonus)`
            : 'Family Cove Digital Card Reload',
          transactionId: payment.id ?? paymentKey,
          extras: { newBalance },
        })
        confirmation = {
          subject: conf.subject,
          nextSteps: conf.nextSteps,
          portalHref: conf.portalHref,
          emailed: conf.emailed,
        }
      } catch (err) {
        console.warn('store-card confirmation failed', err)
      }

      return NextResponse.json({
        ok: true,
        kind,
        paymentId: payment.id,
        paidCents: amountCents,
        loadedCents: loadCents,
        bonusPercent,
        newBalance,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
        confirmation,
      })
    } catch (loadError) {
      await client.items.insert('Payments', {
        studentId: student._id,
        parentEmail: session.email,
        programName: 'Family Cove Digital Card Reload',
        amount,
        status: 'Needs Reconciliation',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_store_card_reload_load_failed',
      })
      console.error('Payment completed but gift card load failed:', loadError)
      return NextResponse.json(
        {
          error:
            'Payment completed, but the balance update needs PTO review. Do not retry this charge.',
          paymentId: payment.id,
        },
        { status: 502 }
      )
    }
    }

  } catch (err) {
    console.error('/api/checkout/pay POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed; your card was not charged' },
      { status: 500 }
    )
  }
}
