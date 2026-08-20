import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { resolvePrimaryParentEmail } from '@/lib/family-guardians'
import {
  createPayPalPaymentTokenFromSetup,
  createPayPalVaultSetupToken,
  deletePayPalPaymentToken,
  isPayPalConfigured,
} from '@/lib/paypal'
import {
  findStoredPaymentMethod,
  hasPayPalVault,
  hasSquareCard,
  upsertStoredPaymentMethod,
} from '@/lib/stored-payment-methods'
import {
  createCardOnFile,
  disableCardOnFile,
  getSquareWebPaymentsConfig,
  upsertSquareCustomer,
} from '@/lib/square'
import { getEffectiveParentEmail } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'

async function householdFromRequest(req: NextRequest) {
  const effective = await getEffectiveParentEmail(req)
  if (!effective) return null
  const householdEmail = await resolvePrimaryParentEmail(effective.parentEmail)
  return { effective, householdEmail }
}

export async function GET(req: NextRequest) {
  const resolved = await householdFromRequest(req)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const method = await findStoredPaymentMethod(resolved.householdEmail)
  const config = getSquareWebPaymentsConfig()
  return NextResponse.json({
    configured: Boolean(config.applicationId && config.locationId),
    applicationId: config.applicationId,
    locationId: config.locationId,
    environment: config.environment,
    paypalConfigured: isPayPalConfigured(),
    paymentMethod: hasSquareCard(method)
      ? {
          brand: method!.brand ?? 'Card',
          last4: method!.last4 ?? '',
          expMonth: method!.expMonth ?? null,
          expYear: method!.expYear ?? null,
        }
      : null,
    paypalMethod: hasPayPalVault(method)
      ? {
          payerEmail: method!.paypalPayerEmail ?? 'PayPal',
        }
      : null,
  })
}

export async function POST(req: NextRequest) {
  const resolved = await householdFromRequest(req)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (resolved.effective.actingAs) {
    return NextResponse.json({ error: 'Act-as is read-only for payment methods.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const action = String(body.action ?? 'saveCard').trim()
    const { session } = resolved.effective
    const householdEmail = resolved.householdEmail

    if (action === 'paypalSetupToken') {
      if (!isPayPalConfigured()) {
        return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
      }
      const setup = await createPayPalVaultSetupToken()
      return NextResponse.json({ setupToken: setup.id })
    }

    if (action === 'paypalPaymentToken') {
      if (!isPayPalConfigured()) {
        return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
      }
      const setupToken = String(body.vaultSetupToken ?? body.setupToken ?? '').trim()
      if (!setupToken) {
        return NextResponse.json({ error: 'PayPal setup token required' }, { status: 400 })
      }
      const token = await createPayPalPaymentTokenFromSetup(setupToken)
      await upsertStoredPaymentMethod(householdEmail, {
        wixMemberId: session.memberId,
        paypalVaultId: token.vaultId,
        paypalCustomerId: token.customerId,
        paypalPayerEmail: token.payerEmail,
      })
      return NextResponse.json({
        ok: true,
        paypalMethod: { payerEmail: token.payerEmail ?? 'PayPal' },
      })
    }

    const { sourceId } = body
    if (!sourceId) {
      return NextResponse.json({ error: 'Card token required' }, { status: 400 })
    }

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    const existing = await findStoredPaymentMethod(householdEmail)
    if (existing?.squareCardId) {
      try {
        await disableCardOnFile(existing.squareCardId)
      } catch (err) {
        console.error('disable previous Square card', err)
      }
    }

    const customer = await upsertSquareCustomer(householdEmail, name)
    if (!customer?.id) throw new Error('Could not create Square customer')

    const card = await createCardOnFile({
      sourceId,
      customerId: customer.id,
      referenceId: session.memberId,
      idempotencyKey: randomUUID(),
    })
    if (!card?.id) throw new Error('Could not store card')

    const row = await upsertStoredPaymentMethod(householdEmail, {
      wixMemberId: session.memberId,
      squareCustomerId: customer.id,
      squareCardId: card.id,
      brand: String(card.cardBrand ?? 'Card'),
      last4: card.last4 ?? '',
      expMonth: card.expMonth ? Number(card.expMonth) : null,
      expYear: card.expYear ? Number(card.expYear) : null,
    })

    return NextResponse.json({
      ok: true,
      paymentMethod: {
        brand: row.brand,
        last4: row.last4,
        expMonth: row.expMonth,
        expYear: row.expYear,
      },
    })
  } catch (err) {
    console.error('/api/gift-card/payment-method POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not save payment method' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const resolved = await householdFromRequest(req)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (resolved.effective.actingAs) {
    return NextResponse.json({ error: 'Act-as is read-only for payment methods.' }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    let kind = url.searchParams.get('kind') || 'card'
    try {
      const body = await req.json()
      if (body?.kind) kind = String(body.kind)
    } catch {
      // no body
    }

    const householdEmail = resolved.householdEmail
    const method = await findStoredPaymentMethod(householdEmail)
    if (!method?._id) return NextResponse.json({ ok: true })

    const client = getWixClient()

    if (kind === 'paypal') {
      if (method.paypalVaultId) {
        try {
          await deletePayPalPaymentToken(method.paypalVaultId)
        } catch (err) {
          console.error('PayPal vault delete', err)
        }
      }
      await client.items.update('StoredPaymentMethods', {
        ...method,
        _id: method._id,
        paypalVaultId: '',
        paypalCustomerId: '',
        paypalPayerEmail: '',
        updatedAt: new Date().toISOString(),
      } as never)
      return NextResponse.json({ ok: true })
    }

    if (method.squareCardId) await disableCardOnFile(method.squareCardId)

    const stillHasPaypal = hasPayPalVault({
      ...method,
      squareCardId: '',
    })
    await client.items.update('StoredPaymentMethods', {
      ...method,
      _id: method._id,
      squareCardId: '',
      squareCustomerId: method.squareCustomerId ?? '',
      brand: '',
      last4: '',
      expMonth: null,
      expYear: null,
      active: stillHasPaypal,
      updatedAt: new Date().toISOString(),
    } as never)

    const students = await client.items
      .query('Students')
      .eq('parentEmail', householdEmail)
      .eq('autoTopOff', true)
      .find()
    for (const student of students.items ?? []) {
      await client.items.update('Students', {
        ...student,
        autoTopOff: false,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/gift-card/payment-method DELETE error:', err)
    return NextResponse.json({ error: 'Could not remove payment method' }, { status: 500 })
  }
}
