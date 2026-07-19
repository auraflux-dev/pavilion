import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getCatalogConfig, isAllowedStoreCardAmount } from '@/lib/api/catalog-config'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getWixClient } from '@/lib/wix-client'
import {
  getStoreCardBonusPercent,
  storeCardLoadCents,
} from '@/lib/store-card-bonus'
import {
  chargePayment,
  createCardOnFile,
  loadGiftCard,
  upsertSquareCustomer,
} from '@/lib/square'

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    if (!studentId || !Number.isInteger(amountCents) || !isAllowedStoreCardAmount(amount, cfg)) {
      return NextResponse.json({ error: 'Invalid student or amount' }, { status: 400 })
    }

    const client = getWixClient()
    const student = (await client.items.get('Students', studentId)) as StudentRow
    if (!student || student.archived === true || student.parentEmail?.trim().toLowerCase() !== session.email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!student.squareGiftCardGan) {
      return NextResponse.json(
        { error: 'This student does not have a linked store card yet. Contact the PTO.' },
        { status: 400 }
      )
    }

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    let stored = await findStoredMethod(session.email)
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
      const customer = await upsertSquareCustomer(session.email, name)
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
      referenceId: `store-card:${studentId}`,
      buyerEmailAddress: session.email,
      note: `SHMS store card reload for ${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
    })

    const settings = await getSiteSettings()
    const bonusPercent = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
    const loadCents = storeCardLoadCents(amountCents, bonusPercent)

    try {
      const activity = await loadGiftCard(
        student.squareGiftCardGan,
        loadCents,
        `reload-${payment.id ?? paymentKey}`.slice(0, 45)
      )
      await client.items.insert('Payments', {
        studentId,
        programName:
          bonusPercent > 0
            ? `Store Card Reload (+${bonusPercent}% bonus)`
            : 'Store Card Reload',
        amount,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: useStoredCard || saveCard ? 'Square Card on File' : 'Square Card',
        transactionId: payment.id ?? paymentKey,
        source: 'square_store_card_reload',
      })
      return NextResponse.json({
        ok: true,
        paymentId: payment.id,
        paidCents: amountCents,
        loadedCents: loadCents,
        bonusPercent,
        newBalance: activity?.giftCardBalanceMoney
          ? Number(activity.giftCardBalanceMoney.amount) / 100
          : null,
        paymentMethod: stored
          ? { brand: stored.brand, last4: stored.last4 }
          : null,
      })
    } catch (loadError) {
      await client.items.insert('Payments', {
        studentId,
        programName: 'Store Card Reload',
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
