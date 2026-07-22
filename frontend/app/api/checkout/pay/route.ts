/**
 * POST /api/checkout/pay
 * In-portal Square card charge for any ecommerce: membership | product | store-card.
 * Free and paid members (logged in) can pay with their own CC — saved card is optional.
 */
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getCatalogConfig, isAllowedStoreCardLoadAmount } from '@/lib/api/catalog-config'
import { getPaidMembershipTiers } from '@/lib/api/membership'
import { fetchCatalogProductPrice } from '@/lib/catalog-price'
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

type Kind = 'membership' | 'product' | 'store-card' | 'program' | 'event'

type StudentRow = {
  _id: string
  firstName?: string
  lastName?: string
  parentEmail?: string
  squareGiftCardGan?: string
  archived?: boolean
}

type StoredMethod = {
  _id?: string
  parentEmail?: string
  squareCustomerId?: string
  squareCardId?: string
  brand?: string
  last4?: string
  expMonth?: number | null
  expYear?: number | null
  active?: boolean
}

async function findStoredMethod(email: string): Promise<StoredMethod | null> {
  const client = getWixClient()
  const result = await client.items
    .query('StoredPaymentMethods')
    .eq('parentEmail', email)
    .eq('active', true)
    .find()
  return (result.items?.[0] as StoredMethod | undefined) ?? null
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

    if (!kind || !['membership', 'product', 'store-card', 'program', 'event'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid checkout kind' }, { status: 400 })
    }

    const consentCheck = validateConsentAcks(kind as CheckoutConsentKind, consents)
    if (!consentCheck.ok) {
      return NextResponse.json({ error: consentCheck.error }, { status: 400 })
    }

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    const client = getWixClient()
    let stored = await findStoredMethod(session.email)
    let paymentSource = sourceId
    let customerId = stored?.squareCustomerId

    if (useStoredCard) {
      if (!stored?.squareCardId || !stored.squareCustomerId) {
        return NextResponse.json({ error: 'No saved card on file — enter your card below' }, { status: 400 })
      }
      paymentSource = stored.squareCardId
      customerId = stored.squareCustomerId
    } else if (saveCard) {
      if (!sourceId) return NextResponse.json({ error: 'Card details required' }, { status: 400 })
      const customer = await upsertSquareCustomer(session.email, name || session.email)
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
      const row = {
        ...(stored ?? {}),
        _id: stored?._id,
        parentEmail: session.email,
        wixMemberId: session.memberId,
        squareCustomerId: customer.id,
        squareCardId: card.id,
        brand: String(card.cardBrand ?? 'Card'),
        last4: card.last4 ?? '',
        expMonth: card.expMonth ? Number(card.expMonth) : null,
        expYear: card.expYear ? Number(card.expYear) : null,
        active: true,
        updatedAt: new Date().toISOString(),
      }
      if (stored?._id) {
        await client.items.update('StoredPaymentMethods', row as never)
      } else {
        delete row._id
        await client.items.insert('StoredPaymentMethods', row)
      }
      stored = row
    }

    if (!paymentSource) {
      return NextResponse.json(
        { error: 'Enter your credit or debit card to pay' },
        { status: 400 }
      )
    }

    // ── Enrichment program ──────────────────────────────────────
    if (kind === 'program') {
      const { resolveCheckoutIntent, fulfillPaidCheckout } = await import('@/lib/checkout-fulfill')
      const programId = String(body.programId ?? '').trim()
      const studentId = String(body.studentId ?? '').trim()
      const resolved = await resolveCheckoutIntent(
        { kind: 'program', programId, studentId },
        session.email
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

    // ── Event tickets ───────────────────────────────────────────
    if (kind === 'event') {
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
      const tier = String(body.tier ?? '').trim().toLowerCase()
      const studentId = typeof body.studentId === 'string' ? body.studentId : null
      const tiers = await getPaidMembershipTiers()
      const match = tiers.find((t) => t.tierId === tier && t.active)
      if (!match || match.price <= 0) {
        return NextResponse.json({ error: 'Unknown membership tier' }, { status: 400 })
      }
      const amountCents = Math.round(match.price * 100)
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: `membership:${tier}`,
        buyerEmailAddress: session.email,
        note: `SHMS PTO membership — ${match.name}`,
      })

      const applied = await applyPaidMembership({
        parentEmail: session.email,
        tier,
        studentId,
        orderId: payment.id ?? paymentKey,
        parentName: name || null,
      })

      await client.items.insert('Payments', {
        programName: `Membership — ${match.name}`,
        amount: match.price,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_membership',
        parentEmail: session.email,
      })

      await recordConsentAcknowledgments({
        parentEmail: session.email,
        kind: 'membership',
        transactionId: payment.id ?? paymentKey,
        studentId,
        acks: consentCheck.acks,
      })

      return NextResponse.json({
        ok: true,
        kind,
        paymentId: payment.id,
        tier,
        applied,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
      })
    }

    // ── Cove / spirit product ───────────────────────────────────
    if (kind === 'product') {
      const productId = String(body.productId ?? '').trim()
      const cfg = await getCatalogConfig()
      const allowed = new Set([
        ...cfg.spiritWearProductIds,
        ...cfg.storeProductIds,
      ])
      if (!productId || !allowed.has(productId)) {
        return NextResponse.json({ error: 'Product not available for checkout' }, { status: 400 })
      }
      const catalog = await fetchCatalogProductPrice(productId)
      if (!catalog) {
        return NextResponse.json({ error: 'Could not resolve product price' }, { status: 400 })
      }
      const amountCents = Math.round(catalog.price * 100)
      if (amountCents < 100) {
        return NextResponse.json({ error: 'Invalid product price' }, { status: 400 })
      }
      const paymentKey = randomUUID()
      const payment = await chargePayment({
        sourceId: paymentSource,
        amountCents,
        idempotencyKey: paymentKey,
        customerId,
        referenceId: `cove:${productId.slice(0, 20)}`,
        buyerEmailAddress: session.email,
        note: `The Cove — ${catalog.name}`,
      })

      await client.items.insert('Payments', {
        programName: `The Cove — ${catalog.name}`,
        amount: catalog.price,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_cove_product',
        parentEmail: session.email,
        notes: productId,
      })

      return NextResponse.json({
        ok: true,
        kind,
        paymentId: payment.id,
        productId,
        productName: catalog.name,
        amount: catalog.price,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
      })
    }

    // ── Family Cove card load / reload ──────────────────────────
    const studentId = String(body.studentId ?? '').trim()
    const amountCents = Number(body.amountCents)
    const amount = amountCents / 100
    const cfg = await getCatalogConfig()
    if (!Number.isInteger(amountCents) || !isAllowedStoreCardLoadAmount(amount, cfg)) {
      return NextResponse.json(
        {
          error: `Invalid amount (use whole dollars $${cfg.storeCardMinAmount}–$${cfg.storeCardMaxAmount})`,
        },
        { status: 400 }
      )
    }

    const family = await listFamilyStudents(session.email)
    if (family.length === 0) {
      return NextResponse.json(
        { error: 'Add a student before loading the family Cove card.' },
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
      referenceId: `store-card:${session.email}`,
      buyerEmailAddress: session.email,
      note: 'SHMS family Cove card load',
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
          ? `Family Cove Card First Load (+${bonusPercent}% bonus)`
          : 'Family Cove Card Reload',
        amount,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_store_card_reload',
        notes:
          bonusPercent > 0
            ? `Paid $${amount}; loaded $${(loadCents / 100).toFixed(2)} (+${bonusPercent}%) on family card`
            : 'Family Cove card load',
      })
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
      })
    } catch (loadError) {
      await client.items.insert('Payments', {
        studentId: student._id,
        parentEmail: session.email,
        programName: 'Family Cove Card Reload',
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
  } catch (err) {
    console.error('/api/checkout/pay POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed; your card was not charged' },
      { status: 500 }
    )
  }
}
