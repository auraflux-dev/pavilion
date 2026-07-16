import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { getWixClient } from '@/lib/wix-client'
import {
  createCardOnFile,
  disableCardOnFile,
  getSquareWebPaymentsConfig,
  upsertSquareCustomer,
} from '@/lib/square'

type StoredMethod = {
  _id?: string
  parentEmail?: string
  squareCustomerId?: string
  squareCardId?: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  active?: boolean
}

async function findMethod(email: string): Promise<StoredMethod | null> {
  const client = getWixClient()
  const result = await client.items
    .query('StoredPaymentMethods')
    .eq('parentEmail', email)
    .eq('active', true)
    .find()
  return (result.items?.[0] as StoredMethod | undefined) ?? null
}

export async function GET(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const method = await findMethod(session.email)
  const config = getSquareWebPaymentsConfig()
  return NextResponse.json({
    configured: Boolean(config.applicationId && config.locationId),
    applicationId: config.applicationId,
    locationId: config.locationId,
    environment: config.environment,
    paymentMethod: method
      ? {
          brand: method.brand ?? 'Card',
          last4: method.last4 ?? '',
          expMonth: method.expMonth ?? null,
          expYear: method.expYear ?? null,
        }
      : null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sourceId } = await req.json()
    if (!sourceId) {
      return NextResponse.json({ error: 'Card token required' }, { status: 400 })
    }

    const name =
      `${session.member.contact?.firstName ?? ''} ${session.member.contact?.lastName ?? ''}`.trim()
    const customer = await upsertSquareCustomer(session.email, name)
    if (!customer?.id) throw new Error('Could not create Square customer')

    const card = await createCardOnFile({
      sourceId,
      customerId: customer.id,
      referenceId: session.memberId,
      idempotencyKey: randomUUID(),
    })
    if (!card?.id) throw new Error('Could not store card')

    const client = getWixClient()
    const existing = await findMethod(session.email)
    const row = {
      ...(existing ?? {}),
      _id: existing?._id,
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

    if (existing?._id) {
      await client.items.update('StoredPaymentMethods', row as any)
    } else {
      delete row._id
      await client.items.insert('StoredPaymentMethods', row)
    }

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
    return NextResponse.json({ error: 'Could not save payment method' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const method = await findMethod(session.email)
    if (!method?._id) return NextResponse.json({ ok: true })
    if (method.squareCardId) await disableCardOnFile(method.squareCardId)

    const client = getWixClient()
    await client.items.update('StoredPaymentMethods', {
      ...method,
      _id: method._id,
      active: false,
      updatedAt: new Date().toISOString(),
    } as any)

    const students = await client.items
      .query('Students')
      .eq('parentEmail', session.email)
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
