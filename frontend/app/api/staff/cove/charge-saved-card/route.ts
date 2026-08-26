/**
 * POST /api/staff/cove/charge-saved-card
 * Charge the household's online saved Square card (StoredPaymentMethods) for
 * in-person Staff sales — full cart or Cove remainder. Retail/admin only.
 *
 * Body: {
 *   code | parentEmail,
 *   amountCents?,          // required if no lines; else derived from priced cart
 *   lines?: [{ productId, variantId?, qty }],
 *   note?, idempotencyKey?
 * }
 */
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lookupFamilyByCoveCode } from '@/lib/cove-family-code'
import {
  decrementPricedInventory,
  priceRegisterCart,
  registerLineSummary,
  type RegisterLineIn,
} from '@/lib/staff/cove-register-sale'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { chargePayment } from '@/lib/square'
import {
  findStoredPaymentMethod,
  hasSquareCard,
} from '@/lib/stored-payment-methods'
import { getWixClient } from '@/lib/wix-client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const code = String(body.code ?? '').trim()
    const parentEmailRaw = String(body.parentEmail ?? '').trim().toLowerCase()
    const note = String(body.note ?? '').trim().slice(0, 200)
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID()).slice(0, 45)
    const linesIn = (Array.isArray(body.lines) ? body.lines : []) as RegisterLineIn[]

    let parentEmail = parentEmailRaw
    let coveFamilyCode = ''
    if (code) {
      const family = await lookupFamilyByCoveCode(code)
      if (!family?.parentEmail) {
        return NextResponse.json({ error: 'Family not found for that code' }, { status: 404 })
      }
      parentEmail = family.parentEmail.trim().toLowerCase()
      coveFamilyCode = family.coveFamilyCode
    }
    if (!parentEmail) {
      return NextResponse.json({ error: 'code or parentEmail required' }, { status: 400 })
    }

    let amountCents = Math.round(Number(body.amountCents))
    let lineSummary = ''
    let priced: Awaited<ReturnType<typeof priceRegisterCart>>['priced'] = []

    if (linesIn.length > 0) {
      const cart = await priceRegisterCart(linesIn)
      priced = cart.priced
      if (!priced.length) {
        return NextResponse.json({ error: 'No valid cart lines' }, { status: 400 })
      }
      amountCents = Math.round(cart.totalDollars * 100)
      lineSummary = registerLineSummary(priced)
    }

    if (!Number.isInteger(amountCents) || amountCents < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least $1.00' },
        { status: 400 },
      )
    }

    const client = getWixClient()
    const prior = await client.items
      .query('Payments')
      .eq('transactionId', idempotencyKey)
      .eq('source', 'cove_register_saved_card')
      .limit(1)
      .find()
    if ((prior.items ?? []).length > 0) {
      const row = prior.items[0] as { amount?: number }
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        amount: Number(row.amount) || amountCents / 100,
        parentEmail,
      })
    }

    const stored = await findStoredPaymentMethod(parentEmail)
    if (!hasSquareCard(stored)) {
      return NextResponse.json(
        { error: 'No saved card on file for this family. Collect on Square Stand or table QR.' },
        { status: 400 },
      )
    }

    const payment = await chargePayment({
      sourceId: stored!.squareCardId!,
      amountCents,
      idempotencyKey,
      customerId: stored!.squareCustomerId,
      referenceId: `cove-pos-saved:${parentEmail}`.slice(0, 40),
      buyerEmailAddress: parentEmail,
      note:
        note ||
        (lineSummary
          ? `SHMS in-person saved card (${coveFamilyCode || parentEmail}): ${lineSummary}`
          : `SHMS Cove in-person remainder (${coveFamilyCode || parentEmail})`),
    })

    if (priced.length > 0) {
      await decrementPricedInventory(priced)
    }

    const dollars = amountCents / 100
    try {
      await client.items.insert('Payments', {
        parentEmail,
        amount: dollars,
        status: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Square Card on File (Staff Cove)',
        transactionId: idempotencyKey,
        source: 'cove_register_saved_card',
        programName: 'The Cove. snack window',
        notes: [
          coveFamilyCode ? `Code ${coveFamilyCode}` : '',
          `${stored!.brand ?? 'Card'} ···${stored!.last4 ?? ''}`,
          lineSummary || '',
          `Square payment ${payment.id ?? ''}`,
          note,
        ]
          .filter(Boolean)
          .join('. '),
      })
    } catch (err) {
      console.warn('cove charge-saved-card Payments insert failed:', err)
    }

    return NextResponse.json({
      ok: true,
      amount: dollars,
      parentEmail,
      coveFamilyCode: coveFamilyCode || undefined,
      brand: stored!.brand ?? 'Card',
      last4: stored!.last4 ?? '',
      squarePaymentId: payment.id ?? null,
      lines: priced.length ? priced : undefined,
    })
  } catch (err) {
    console.error('cove charge-saved-card', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not charge saved card' },
      { status: 500 },
    )
  }
}
