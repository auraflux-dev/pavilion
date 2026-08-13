import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCatalogConfig, isAllowedStoreCardLoadAmount } from '@/lib/api/catalog-config'
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import { getWixClient } from '@/lib/wix-client'
import {
  getStoreCardBonusPercent,
  resolveParentLoadBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'
import {
  chargePayment,
  createCardOnFile,
  createOrLoadStudentGiftCard,
  loadGiftCard,
  upsertSquareCustomer,
} from '@/lib/square'
import { getEffectiveParentEmail } from '@/lib/staff/session'

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
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (effective.actingAs) {
    return NextResponse.json({ error: 'Act-as is read-only for Cove loads.' }, { status: 403 })
  }

  try {
    const {
      studentId,
      amountCents,
      sourceId,
      useStoredCard = false,
      saveCard = false,
    } = await req.json()
    const amount = Number(amountCents) / 100
    const cfg = await getCatalogConfig()
    const householdEmail = await resolvePrimaryParentEmail(effective.parentEmail)
    const { session } = effective

    if (!Number.isInteger(amountCents) || !isAllowedStoreCardLoadAmount(amount, cfg)) {
      return NextResponse.json(
        {
          error: `Invalid amount (use whole dollars ${cfg.storeCardMinAmount} to ${cfg.storeCardMaxAmount})`,
        },
        { status: 400 }
      )
    }

    const client = getWixClient()
    const family = await listFamilyStudents(householdEmail)
    if (family.length === 0) {
      return NextResponse.json(
        { error: 'Add a student before loading the family Cove Digital Card.' },
        { status: 400 }
      )
    }
    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(householdEmail)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, code: 'ONBOARDING_INCOMPLETE' },
        { status: 403 }
      )
    }
    let student =
      (studentId
        ? (family.find((s) => s._id === studentId) as StudentRow | undefined)
        : undefined) ?? (family[0] as StudentRow)
    if (!student?._id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const familyCard = resolveFamilyGiftCard(family)

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    let stored = await findStoredMethod(householdEmail)
    let paymentSource = sourceId as string | undefined
    let customerId = stored?.squareCustomerId

    if (useStoredCard) {
      if (!stored?.squareCardId || !stored.squareCustomerId) {
        return NextResponse.json({ error: 'No saved card on file' }, { status: 400 })
      }
      paymentSource = stored.squareCardId
      customerId = stored.squareCustomerId
    } else if (saveCard) {
      if (!sourceId) return NextResponse.json({ error: 'Card token required' }, { status: 400 })
      const customer = await upsertSquareCustomer(householdEmail, name)
      if (!customer?.id) throw new Error('Could not create Square customer')
      const card = await createCardOnFile({
        sourceId,
        customerId: customer.id,
        referenceId: session.memberId,
        idempotencyKey: randomUUID(),
      })
      if (!card?.id) throw new Error('Could not store card')
      paymentSource = card.id
      customerId = customer.id

      const row = {
        ...(stored ?? {}),
        _id: stored?._id,
        parentEmail: householdEmail,
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
        await client.items.update('StoredPaymentMethods', row as any)
      } else {
        delete row._id
        await client.items.insert('StoredPaymentMethods', row)
      }
      stored = row
    }

    if (!paymentSource) {
      return NextResponse.json({ error: 'Payment token required' }, { status: 400 })
    }

    const paymentKey = randomUUID()
    const payment = await chargePayment({
      sourceId: paymentSource,
      amountCents,
      idempotencyKey: paymentKey,
      customerId,
      referenceId: `store-card:${householdEmail}`,
      buyerEmailAddress: householdEmail,
      note: 'SHMS PTO family Cove Digital Card load',
    })

    const settings = await getSiteSettings()
    const configuredBonus = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
    const bonusPercent = await resolveParentLoadBonusPercent(householdEmail, configuredBonus)
    const loadCents = storeCardLoadCents(amountCents, bonusPercent)
    const isFirstLoad = bonusPercent > 0

    try {
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
        parentEmail: householdEmail,
        gan,
        giftCardId,
        balanceDollars: newBalance ?? loadCents / 100,
      })

      await client.items.insert('Payments', {
        studentId: student._id,
        parentEmail: householdEmail,
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
      return NextResponse.json({
        ok: true,
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
        parentEmail: householdEmail,
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
  } catch (err) {
    console.error('/api/gift-card/reload POST error:', err)
    return NextResponse.json({ error: 'Payment failed; your card was not loaded' }, { status: 500 })
  }
}
