/**
 * Shared quote + post-payment fulfillment for Square and PayPal.
 */
import { getCatalogConfig, isAllowedStoreCardLoadAmount } from '@/lib/api/catalog-config'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import {
  fetchCatalogProductDetail,
  fetchCatalogVariantPrice,
} from '@/lib/catalog-price'
import { applyPaidMembership } from '@/lib/membership-sync'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import { getWixClient } from '@/lib/wix-client'
import {
  createOrLoadStudentGiftCard,
  loadGiftCard,
  redeemGiftCard,
  upsertSquareCustomerForCoveStand,
} from '@/lib/square'
import {
  getStoreCardBonusPercent,
  resolveParentLoadBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'
import { applyCheckoutDiscount, consumeDiscountCode } from '@/lib/checkout-discounts'
import { enrollInProgram } from '@/lib/program-enroll'
import type { ConsentAck } from '@/lib/checkout-consent'
import {
  sendPurchaseConfirmation,
  type PurchaseConfirmationInput,
} from '@/lib/purchase-confirmation'

export type CheckoutKind = 'membership' | 'product' | 'store-card' | 'program' | 'event' | 'donation'

export type CheckoutIntent = {
  kind: CheckoutKind
  tier?: string
  studentId?: string | null
  /** Spirit Wear size when membership includes a free T-shirt */
  shirtSize?: string | null
  shirtDesign?: string | null
  shirtProductId?: string | null
  shirtVariantId?: string | null
  physicalPerk?: string | null
  productId?: string
  /** Wix Catalog variant when the product has Color/Size options */
  variantId?: string
  programId?: string
  eventId?: string
  quantity?: number
  amountCents?: number
  couponCode?: string | null
  useCoveBalance?: boolean
  /** Optional parent note for donations */
  note?: string
  consents?: import('@/lib/checkout-consent').ConsentAck[]
}

export type ResolvedCheckout = {
  kind: CheckoutKind
  amount: number
  amountCents: number
  description: string
  customId: string
  /** Extra fields needed at fulfill time */
  meta: Record<string, string>
}

type StudentRow = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  squareGiftCardGan?: string
  archived?: boolean
}

async function attachPurchaseConfirmation(
  result: Record<string, unknown>,
  input: PurchaseConfirmationInput,
): Promise<Record<string, unknown>> {
  try {
    const confirmation = await sendPurchaseConfirmation(input)
    return {
      ...result,
      confirmation: {
        subject: confirmation.subject,
        nextSteps: confirmation.nextSteps,
        portalHref: confirmation.portalHref,
        emailed: confirmation.emailed,
      },
    }
  } catch (err) {
    console.warn('[checkout-fulfill] confirmation failed', err)
    return result
  }
}

export async function resolveCheckoutIntent(
  intent: CheckoutIntent,
  parentEmail: string,
  accountEmails?: string[],
): Promise<ResolvedCheckout> {
  const kind = intent.kind

  if (kind === 'membership') {
    const tier = String(intent.tier ?? '').trim().toLowerCase()
    const tiers = await getPaidMembershipTiers()
    const match = tiers.find((t) => t.tierId === tier && t.active)
    if (!match || match.price <= 0) throw new Error('Unknown membership tier')
    const { getParentHighestTier, membershipChargeDollars, formatTierLabel } =
      await import('@/lib/membership-pricing')
    const { tierRank } = await import('@/lib/staff/members-roster')
    const currentTier = await getParentHighestTier(parentEmail)
    if (tierRank(currentTier) >= tierRank(tier) && tierRank(currentTier) > 0) {
      throw new Error(
        `You already have ${formatTierLabel(currentTier)} membership. Choose a higher tier to upgrade.`,
      )
    }
    const charge = membershipChargeDollars({
      targetTier: tier,
      currentTier,
      tiers,
    })
    if (charge.amount <= 0) throw new Error('Nothing to charge for this upgrade')
    return {
      kind,
      amount: charge.amount,
      amountCents: Math.round(charge.amount * 100),
      description: charge.isUpgrade
 ? `SHMS PTO membership upgrade: ${formatTierLabel(currentTier)} → ${match.name}`
 : `SHMS PTO membership: ${match.name}`,
      customId: `membership:${tier}`,
      meta: {
        tier,
        tierName: match.name,
        studentId: intent.studentId ? String(intent.studentId) : '',
        shirtSize: intent.shirtSize ? String(intent.shirtSize) : '',
        shirtDesign: intent.shirtDesign ? String(intent.shirtDesign) : '',
        shirtProductId: intent.shirtProductId ? String(intent.shirtProductId) : '',
        shirtVariantId: intent.shirtVariantId ? String(intent.shirtVariantId) : '',
        physicalPerk: intent.physicalPerk ? String(intent.physicalPerk) : '',
        isUpgrade: charge.isUpgrade ? '1' : '',
        currentTier,
        listPrice: String(charge.listPrice),
      },
    }
  }

  if (kind === 'product') {
    const productId = String(intent.productId ?? '').trim()
    const variantId = String(intent.variantId ?? '').trim()
    const cfg = await getCatalogConfig()
    const allowed = new Set([...cfg.spiritWearProductIds, ...cfg.storeProductIds])
    if (!productId || !allowed.has(productId)) {
      throw new Error('Product not available for checkout')
    }
    let amount = 0
    let productName = ''
    let variantLabel = ''
    if (variantId) {
      const variant = await fetchCatalogVariantPrice(productId, variantId)
      if (!variant || variant.price < 1) throw new Error('Could not resolve product price')
      amount = variant.price
      productName = variant.name
      variantLabel = variant.variantLabel
    } else {
      const detail = await fetchCatalogProductDetail(productId)
      if (!detail || detail.price < 1) throw new Error('Could not resolve product price')
      if (detail.variants.length > 1) {
        throw new Error('Choose a color or size before checkout')
      }
      amount = detail.variants[0]?.price ?? detail.price
      productName = detail.name
      variantLabel = detail.variants[0]?.label ?? ''
    }
    const label =
      variantLabel && variantLabel !== 'Default'
        ? `${productName} (${variantLabel})`
        : productName
    const applied = await applyCheckoutDiscount({
      scope: 'product',
      listAmount: amount,
      couponCode: intent.couponCode,
      parentEmail,
      accountEmails,
    })
    if (applied.error) throw new Error(applied.error)
    const charged = applied.amount
    const discount = applied.discount
    return {
      kind,
      amount: charged,
      amountCents: Math.round(charged * 100),
      description: `The Cove: ${label}`,
      // Square reference_id max length is 40.
      customId: `cv:${productId.replace(/-/g, '').slice(0, 37)}`,
      meta: {
        productId,
        productName: label,
        ...(variantId ? { variantId } : {}),
        ...(variantLabel ? { variantLabel } : {}),
        ...(discount?.code ? { discountCode: discount.code } : {}),
        ...(discount ? { discountPercent: String(discount.percent) } : {}),
        ...(discount ? { discountDollars: String(discount.dollars) } : {}),
        ...(discount?.consumeId ? { consumeDiscountId: discount.consumeId } : {}),
        listPrice: String(amount),
      },
    }
  }

  if (kind === 'program') {
    const { getProgramById } = await import('@/lib/api/programs')
    const { enrichmentDiscountPercent } = await import('@/lib/membership-entitlements')
    const { normalizeMembershipTier } = await import('@/lib/staff/members-roster')
    const programId = String(intent.programId ?? '').trim()
    const studentId = String(intent.studentId ?? '').trim()
    if (!programId || !studentId) throw new Error('Program and student required')
    const program = await getProgramById(programId)
    if (!program) throw new Error('Program not open for registration')
    const stagingCheckout =
      process.env.VERCEL_ENV === 'preview' || process.env.PROGRAMS_STAGING_CHECKOUT === 'true'
    if (!program.registrationOpen && !stagingCheckout) {
      throw new Error('Program not open for registration')
    }
    const { assertCanRegisterForProgram } = await import('@/lib/programs/registration-access')
    const access = await assertCanRegisterForProgram(
      stagingCheckout ? { ...program, registrationOpen: true } : program,
      parentEmail,
    )
    if (!access.ok) throw new Error(access.error || 'Registration not available')
    const fee = Number(program.fee ?? 0)
 if (fee <= 0) throw new Error('This program does not require payment. Use free registration')

    const client = getWixClient()
    const student = (await client.items.get('Students', studentId).catch(() => null)) as {
      membershipTier?: string
      parentEmail?: string
      discountCode?: string
    } | null
    const tier = normalizeMembershipTier(String(student?.membershipTier ?? 'free'))
    const percent = enrichmentDiscountPercent(tier)
    const applied = await applyCheckoutDiscount({
      scope: 'program',
      listAmount: fee,
      couponCode: intent.couponCode,
      parentEmail,
      accountEmails,
      tierPercent: percent,
    })
    if (applied.error) throw new Error(applied.error)
    const discount = applied.discount
    const amount = applied.amount
    const discountDollars = discount?.dollars ?? 0
    const appliedPercent = discount?.percent ?? 0

    return {
      kind,
      amount,
      amountCents: Math.round(amount * 100),
      description:
        appliedPercent > 0
          ? `Enrichment: ${program.name} (${appliedPercent}% discount)`
          : `Enrichment: ${program.name}`,
      customId: `pg:${programId.replace(/-/g, '').slice(0, 37)}`,
      meta: {
        programId,
        programName: program.name,
        studentId,
        listFee: String(fee),
        memberDiscountPercent: String(appliedPercent || 0),
        memberDiscountDollars: String(discountDollars || 0),
        discountCode: discount?.code || String(student?.discountCode ?? ''),
        ...(discount?.consumeId ? { consumeDiscountId: discount.consumeId } : {}),
      },
    }
  }

  if (kind === 'event') {
    const { getEventTicketOffer } = await import('@/lib/events/tickets')
    const eventId = String(intent.eventId ?? '').trim()
    const quantity = Math.max(1, Math.min(10, Number(intent.quantity ?? 1) || 1))
    if (!eventId) throw new Error('Event required')
    const offer = await getEventTicketOffer(eventId)
    if (!offer || !offer.active || !offer.registrationOpen) {
      throw new Error('Tickets are not on sale for this event')
    }
    const price = Number(offer.ticketPrice ?? 0)
    if (price <= 0) throw new Error('Ticket price not configured')
    const capacity = Number(offer.capacity ?? 0) || 0
    const sold = Number(offer.soldCount ?? 0) || 0
    if (capacity > 0 && sold + quantity > capacity) {
      throw new Error('Not enough tickets remaining')
    }
    const amount = price * quantity
    return {
      kind,
      amount,
      amountCents: Math.round(amount * 100),
 description: `Event tickets: ${offer.eventTitle} × ${quantity}`,
      customId: `ev:${eventId.replace(/-/g, '').slice(0, 37)}`,
      meta: {
        eventId,
        eventTitle: offer.eventTitle,
        quantity: String(quantity),
        ticketPrice: String(price),
      },
    }
  }

  if (kind === 'donation') {
    const { isAllowedDonationAmount, donationAmountCents } = await import('@/lib/donation')
    const amountCents = Number(intent.amountCents)
    const amount = amountCents / 100
    if (!Number.isInteger(amountCents) || !isAllowedDonationAmount(amount)) {
      throw new Error('Enter a donation between $1 and $10,000')
    }
    const note = String(intent.note ?? '').trim().slice(0, 120)
    return {
      kind,
      amount,
      amountCents: donationAmountCents(amount),
      description: 'SHMS PTO donation',
      customId: `dn:${parentEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 37)}`,
      meta: {
        parentEmail,
        note,
      },
    }
  }

  const studentId = String(intent.studentId ?? '').trim()
  const amountCents = Number(intent.amountCents)
  const amount = amountCents / 100
  const cfg = await getCatalogConfig()
  if (!Number.isInteger(amountCents) || !isAllowedStoreCardLoadAmount(amount, cfg)) {
    throw new Error(
 `Invalid amount (use whole dollars $${cfg.storeCardMinAmount} to $${cfg.storeCardMaxAmount})`
    )
  }
  const family = await listFamilyStudents(parentEmail)
  if (family.length === 0) {
    throw new Error('Add a student before loading the family Cove Digital Card.')
  }
  const student = (studentId ? family.find((s) => s._id === studentId) : undefined) ?? family[0]
  if (!student?._id) {
    throw new Error('Student not found')
  }
  const familyCard = resolveFamilyGiftCard(family)
  return {
    kind: 'store-card',
    amount,
    amountCents,
    description: 'Family Cove Digital Card load',
    customId: `sc:${parentEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 37)}`,
    meta: {
      studentId: student._id,
      gan: familyCard.gan,
      giftCardId: familyCard.giftCardId,
      parentEmail,
      studentLabel: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
    },
  }
}

export async function fulfillPaidCheckout(opts: {
  resolved: ResolvedCheckout
  parentEmail: string
  parentName: string
  transactionId: string
  paymentMethod: string
  sourcePrefix: 'square' | 'paypal'
  consents?: ConsentAck[]
}): Promise<Record<string, unknown>> {
  const { resolved, parentEmail, parentName, transactionId, paymentMethod, sourcePrefix, consents } =
    opts
  const client = getWixClient()

  if (resolved.kind === 'program') {
    const enrolled = await enrollInProgram({
      parentEmail,
      programId: resolved.meta.programId,
      studentId: resolved.meta.studentId,
      consents: consents ?? [],
      transactionId,
      feePaid: resolved.amount,
    })
    await client.items.insert('Payments', {
 programName: `Enrichment: ${resolved.meta.programName}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_program`,
      parentEmail,
      studentId: resolved.meta.studentId,
      notes: resolved.meta.discountCode
        ? `${resolved.meta.programId} · ${resolved.meta.discountCode}`
        : resolved.meta.programId,
    })
    if (resolved.meta.consumeDiscountId) {
      await consumeDiscountCode(resolved.meta.consumeDiscountId)
    }
    return attachPurchaseConfirmation(
      {
        kind: 'program',
        ...enrolled,
        paymentId: transactionId,
      },
      {
        kind: 'program',
        parentEmail,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
        extras: enrolled as Record<string, unknown>,
      },
    )
  }

  if (resolved.kind === 'membership') {
    const tier = resolved.meta.tier
    const studentId = resolved.meta.studentId || null
    const applied = await applyPaidMembership({
      parentEmail,
      tier,
      studentId,
      orderId: transactionId,
      parentName: parentName || null,
      shirtSize: resolved.meta.shirtSize || null,
      shirtDesign: resolved.meta.shirtDesign || null,
      shirtProductId: resolved.meta.shirtProductId || null,
      shirtVariantId: resolved.meta.shirtVariantId || null,
      physicalPerk: (resolved.meta.physicalPerk as 'spirit_shirt' | 'magnet' | null) || null,
    })
    await client.items.insert('Payments', {
      programName: resolved.meta.isUpgrade === '1'
 ? `Membership upgrade: ${resolved.meta.currentTier} → ${resolved.meta.tierName}`
 : `Membership: ${resolved.meta.tierName}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_membership`,
      parentEmail,
      ...(studentId ? { studentId } : {}),
      ...(applied.updatedStudentIds?.[0] && !studentId
        ? { studentId: applied.updatedStudentIds[0] }
        : {}),
    })
    return attachPurchaseConfirmation(
      { kind: 'membership', tier, applied, paymentId: transactionId },
      {
        kind: 'membership',
        parentEmail,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
      },
    )
  }

  if (resolved.kind === 'product') {
    const coveCents = Math.round(Number(resolved.meta.coveCents ?? 0) || 0)
    const gan = String(resolved.meta.gan ?? '').trim()
    let coveNewBalance = ''
    if (coveCents > 0) {
      if (!gan) throw new Error('Cove Digital Card is missing for this split payment')
      const activity = await redeemGiftCard(gan, coveCents, `${transactionId}-cove`)
      const newBalance = activity?.giftCardBalanceMoney
        ? Number(activity.giftCardBalanceMoney.amount) / 100
        : 0
      coveNewBalance = newBalance.toFixed(2)
      await syncFamilyStoreCard({
        parentEmail,
        gan,
        giftCardId: resolved.meta.giftCardId,
        balanceDollars: newBalance,
      })
    }
    if (resolved.meta.consumeDiscountId) {
      await consumeDiscountCode(resolved.meta.consumeDiscountId)
    }
    const cardCents = Math.round(Number(resolved.meta.cardCents ?? resolved.amountCents) || 0)
    const methodNote =
      coveCents > 0 && cardCents > 0
        ? `${paymentMethod} + Cove Digital Card`
        : coveCents > 0 && cardCents <= 0
          ? 'Cove Digital Card'
          : paymentMethod
    let productStudentId = ''
    const familyStudents = await listFamilyStudents(parentEmail)
    productStudentId = familyStudents[0]?._id ?? ''
    await client.items.insert('Payments', {
 programName: `The Cove: ${resolved.meta.productName}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod: methodNote,
      transactionId,
      source: `${sourcePrefix}_cove_product`,
      parentEmail,
      ...(productStudentId ? { studentId: productStudentId } : {}),
      notes: [
        resolved.meta.variantId
          ? `${resolved.meta.productId}:${resolved.meta.variantId}`
          : resolved.meta.productId,
        resolved.meta.discountCode ? `code ${resolved.meta.discountCode}` : '',
        coveCents > 0 ? `Cove $${(coveCents / 100).toFixed(2)}` : '',
        cardCents > 0 ? `card $${(cardCents / 100).toFixed(2)}` : '',
        coveNewBalance ? `Cove balance $${coveNewBalance}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    })
    return attachPurchaseConfirmation(
      {
        kind: 'product',
        productId: resolved.meta.productId,
        productName: resolved.meta.productName,
        amount: resolved.amount,
        paymentId: transactionId,
      },
      {
        kind: 'product',
        parentEmail,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
      },
    )
  }

  if (resolved.kind === 'event') {
    const { recordEventTicketSale } = await import('@/lib/events/tickets')
    const quantity = Math.max(1, Number(resolved.meta.quantity ?? 1) || 1)
    await recordEventTicketSale({
      eventId: resolved.meta.eventId,
      quantity,
      parentEmail,
      parentName,
      transactionId,
      amount: resolved.amount,
    })
    await client.items.insert('Payments', {
 programName: `Event: ${resolved.meta.eventTitle}`,
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_event_ticket`,
      parentEmail,
      notes: `${resolved.meta.eventId}|qty:${quantity}`,
    })
    return attachPurchaseConfirmation(
      {
        kind: 'event',
        eventId: resolved.meta.eventId,
        eventTitle: resolved.meta.eventTitle,
        quantity,
        amount: resolved.amount,
        paymentId: transactionId,
      },
      {
        kind: 'event',
        parentEmail,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
      },
    )
  }

  if (resolved.kind === 'donation') {
    const note = resolved.meta.note || ''
    await client.items.insert('Payments', {
      programName: 'PTO Donation',
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_donation`,
      parentEmail,
      notes: note || 'General PTO donation',
    })
    return attachPurchaseConfirmation(
      {
        kind: 'donation',
        amount: resolved.amount,
        paymentId: transactionId,
      },
      {
        kind: 'donation',
        parentEmail,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
      },
    )
  }

  const studentId = resolved.meta.studentId
  const parentEmailForCard = resolved.meta.parentEmail || parentEmail
  try {
    const settings = await getSiteSettings()
    const configuredBonus = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
    const bonusPercent = await resolveParentLoadBonusPercent(parentEmailForCard, configuredBonus)
    const loadCents = storeCardLoadCents(resolved.amountCents, bonusPercent)
    const isFirstLoad = bonusPercent > 0

    const family = await listFamilyStudents(parentEmailForCard)
    const familyCard = resolveFamilyGiftCard(family)
    let gan = String(resolved.meta.gan || familyCard.gan || '').trim()
    let giftCardId = String(resolved.meta.giftCardId || familyCard.giftCardId || '').trim()
    let activity: Awaited<ReturnType<typeof loadGiftCard>> | null = null
    let newBalance: number | null = null

    if (!gan) {
      const card = await createOrLoadStudentGiftCard({
        amountCents: loadCents,
        idempotencyKey: `first-load-${transactionId}`.slice(0, 45),
        buyerPaymentInstrumentIds: [transactionId],
      })
      gan = card.gan
      giftCardId = card.giftCardId
      newBalance = loadCents / 100
    } else {
      activity = await loadGiftCard(gan, loadCents, `reload-${transactionId}`.slice(0, 45), [transactionId])
      newBalance = activity?.giftCardBalanceMoney
        ? Number(activity.giftCardBalanceMoney.amount) / 100
        : familyCard.balance + loadCents / 100
    }

    await syncFamilyStoreCard({
      parentEmail: parentEmailForCard,
      gan,
      giftCardId,
      balanceDollars: newBalance ?? loadCents / 100,
    })

    try {
      const { ensureCoveFamilyCode, getCoveFamilyPasscode } = await import(
        '@/lib/cove-family-code'
      )
      await upsertSquareCustomerForCoveStand({
        email: parentEmailForCard,
        coveFamilyCode: await ensureCoveFamilyCode(parentEmailForCard),
        coveFamilyPasscode: await getCoveFamilyPasscode(parentEmailForCard),
        giftCardId,
        gan,
      })
    } catch {
      // Stand directory sync is best-effort
    }

    await client.items.insert('Payments', {
      studentId,
      parentEmail: parentEmailForCard,
      programName: isFirstLoad
        ? `Family Cove Digital Card First Load (+${bonusPercent}% bonus)`
        : 'Family Cove Digital Card Reload',
      amount: resolved.amount,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_store_card_reload`,
      notes:
        bonusPercent > 0
          ? `Paid $${resolved.amount}; loaded $${(loadCents / 100).toFixed(2)} (+${bonusPercent}%) on the Cove Digital Card`
          : 'Family Cove Digital Card load',
    })
    return attachPurchaseConfirmation(
      {
        kind: 'store-card',
        paymentId: transactionId,
        bonusPercent,
        loadedCents: loadCents,
        newBalance,
      },
      {
        kind: 'store-card',
        parentEmail: parentEmailForCard,
        parentName,
        amount: resolved.amount,
        description: resolved.description,
        transactionId,
        meta: resolved.meta,
        extras: { newBalance, bonusPercent },
      },
    )
  } catch (loadError) {
    await client.items.insert('Payments', {
      studentId,
      programName: 'Store Card Reload',
      amount: resolved.amount,
      status: 'Needs Reconciliation',
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      source: `${sourcePrefix}_store_card_reload_load_failed`,
    })
    console.error('Payment completed but gift card load failed:', loadError)
    const err = new Error(
      'Payment completed, but the balance update needs PTO review. Do not retry this charge.'
    ) as Error & { paymentId?: string; status?: number }
    err.paymentId = transactionId
    err.status = 502
    throw err
  }
}
