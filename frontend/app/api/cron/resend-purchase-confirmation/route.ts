/**
 * POST /api/cron/resend-purchase-confirmation
 * Auth: Authorization: Bearer $CRON_SECRET
 * Body: { transactionId: string } — resends parent + staff payment emails for that payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { sendPurchaseConfirmation } from '@/lib/purchase-confirmation'
import type { PurchaseConfirmKind } from '@/lib/purchase-confirmation'
import { reportError } from '@/lib/observability/error-reporting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secrets = [process.env.CRON_SECRET, process.env.PURCHASE_RESEND_SECRET]
    .map((s) => s?.trim())
    .filter(Boolean) as string[]
  return secrets.some((secret) => auth === `Bearer ${secret}`)
}

function kindFromPayment(row: Record<string, unknown>): PurchaseConfirmKind {
  const type = String(row.type || row.source || row.kind || '').toLowerCase()
  if (type.includes('program') || type.includes('enroll')) return 'program'
  if (type.includes('membership')) return 'membership'
  if (type.includes('store') || type.includes('gift')) return 'store-card'
  if (type.includes('event') || type.includes('ticket')) return 'event'
  if (type.includes('donat')) return 'donation'
  if (type.includes('cart')) return 'program'
  return 'product'
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      transactionId?: string
      paymentId?: string
    }
    const transactionId = String(body.transactionId || '').trim()
    const paymentId = String(body.paymentId || '').trim()
    if (!transactionId && !paymentId) {
      return NextResponse.json(
        { error: 'Provide transactionId or paymentId' },
        { status: 400 },
      )
    }

    const client = getWixClient()
    let row: Record<string, unknown> | null = null
    if (paymentId) {
      const item = await client.items.get('Payments', paymentId)
      row = (item as Record<string, unknown>) || null
    } else {
      const found = await client.items
        .query('Payments')
        .eq('transactionId', transactionId)
        .limit(5)
        .find()
      row = (found.items?.[0] as Record<string, unknown>) || null
      if (!row) {
        const found2 = await client.items
          .query('Payments')
          .limit(50)
          .descending('_createdDate')
          .find()
        row =
          (found2.items ?? []).find((item) => {
            const r = item as Record<string, unknown>
            const tx = String(r.transactionId || r.squarePaymentId || '')
            return tx === transactionId || tx.startsWith(`${transactionId}:`)
          }) as Record<string, unknown> | undefined ?? null
      }
    }

    if (!row) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const parentEmail = String(row.parentEmail || row.email || '').trim()
    if (!parentEmail) {
      return NextResponse.json({ error: 'Payment has no parent email' }, { status: 400 })
    }

    const amount = Number(row.amount ?? 0) || 0
    const description = String(
      row.description || row.programName || row.programTitle || 'SHMS PTO purchase',
    )
    const tx = String(row.transactionId || row.squarePaymentId || transactionId || paymentId)
    const programName = String(row.programName || row.programTitle || '')
    const kind = kindFromPayment(row)
    const notes = String(row.notes || '')
    const coveMatch = notes.match(/Cove\s+\$([0-9]+(?:\.[0-9]+)?)/i)
    const cardMatch = notes.match(/card\s+\$([0-9]+(?:\.[0-9]+)?)/i)
    const balMatch = notes.match(/Cove balance\s+\$([0-9]+(?:\.[0-9]+)?)/i)
    const extras: Record<string, unknown> = {}
    if (coveMatch) extras.coveCharged = Number(coveMatch[1])
    if (cardMatch) extras.remainderDue = Number(cardMatch[1])
    if (balMatch) extras.coveNewBalance = Number(balMatch[1]).toFixed(2)

    const confirmation = await sendPurchaseConfirmation({
      kind,
      parentEmail,
      parentName: String(row.parentName || row.studentName || '').trim() || undefined,
      amount,
      description,
      transactionId: tx,
      meta: programName ? { programName } : undefined,
      extras: Object.keys(extras).length ? extras : undefined,
    })

    return NextResponse.json({
      ok: true,
      emailed: confirmation.emailed,
      subject: confirmation.subject,
      parentEmail,
      transactionId: tx,
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/resend-purchase-confirmation' })
    return NextResponse.json(
      { error: 'Resend failed', eventId },
      { status: 500 },
    )
  }
}
