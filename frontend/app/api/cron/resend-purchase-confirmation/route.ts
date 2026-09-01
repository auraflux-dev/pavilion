/**
 * POST /api/cron/resend-purchase-confirmation
 * Auth: Bearer $CRON_SECRET or $PURCHASE_RESEND_SECRET
 * Body: {
 *   transactionId?: string
 *   paymentId?: string
 *   kind?: PurchaseConfirmKind
 *   parentName?: string
 *   description?: string
 *   programName?: string
 *   amount?: number
 *   notifyStaff?: boolean   // default false — do not re-blast staff alerts
 * }
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
  if (secrets.some((secret) => auth === `Bearer ${secret}`)) return true
  // Temporary until CRON_SECRET is in Doppler (remove after 2026-09-02).
  // Scoped to Carmen bag receipt repair only.
  if (
    Date.now() < Date.parse('2026-09-03T00:00:00Z') &&
    auth === 'Bearer carmen-receipt-dUBN7kVkrAYFaaCl3Fw9jb2B46JZY'
  ) {
    return true
  }
  return false
}

function kindFromPayment(row: Record<string, unknown>): PurchaseConfirmKind {
  const type = String(row.type || row.source || row.kind || '').toLowerCase()
  const name = String(row.programName || row.programTitle || row.description || '').toLowerCase()
  if (type.includes('program') || type.includes('enroll') || name.includes('enrichment')) {
    return 'program'
  }
  if (type.includes('membership') || name.includes('membership')) return 'membership'
  if (type.includes('store') || type.includes('gift') || name.includes('cove digital')) {
    return 'store-card'
  }
  if (type.includes('event') || type.includes('ticket')) return 'event'
  if (type.includes('donat')) return 'donation'
  if (type.includes('cart') || name.includes('bag')) return 'program'
  // Never treat poisoned Stand ledger rows as Cove/shop when notes look like enrollments
  const notes = String(row.notes || '').toLowerCase()
  if (notes.includes('enrichment') || /competitive math|robotics|chess/.test(notes)) {
    return 'program'
  }
  return 'product'
}

function paymentRank(row: Record<string, unknown>): number {
  const source = String(row.source || '').toLowerCase()
  const name = String(row.programName || row.programTitle || row.description || '').toLowerCase()
  if (source.includes('square_pos_stand') || name.includes('in-person sales')) return 0
  if (source.includes('_program') || name.includes('enrichment')) return 100
  if (source.includes('_cart') || name.includes('bag')) return 90
  if (source.includes('membership')) return 80
  if (source.includes('checkout')) return 70
  return 40
}

function pickBestPaymentRow(
  items: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  if (!items.length) return null
  return [...items].sort((a, b) => paymentRank(b) - paymentRank(a))[0] ?? null
}

function amountFromRow(row: Record<string, unknown>, override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) return Number(override)
  const stored = Number(row.amount ?? 0) || 0
  const notes = String(row.notes || '')
  const coveMatch = notes.match(/Cove\s+\$([0-9]+(?:\.[0-9]+)?)/i)
  const cardMatch = notes.match(/card\s+\$([0-9]+(?:\.[0-9]+)?)/i)
  if (coveMatch && cardMatch) {
    const total = Number(coveMatch[1]) + Number(cardMatch[1])
    // Prefer reconstructed total when ledger amount looks like card-only tender
    if (total > 0 && (stored <= 0 || Math.abs(stored - Number(cardMatch[1])) < 0.02)) {
      return Math.round(total * 100) / 100
    }
  }
  return stored
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      transactionId?: string
      paymentId?: string
      kind?: PurchaseConfirmKind
      parentName?: string
      description?: string
      programName?: string
      amount?: number
      notifyStaff?: boolean
    }
    const transactionId = String(body.transactionId || '').trim()
    const paymentId = String(body.paymentId || '').trim()
    if (!transactionId && !paymentId) {
      return NextResponse.json(
        { error: 'Provide transactionId or paymentId' },
        { status: 400 },
      )
    }
    if (
      authHeader === 'Bearer carmen-receipt-dUBN7kVkrAYFaaCl3Fw9jb2B46JZY' &&
      transactionId !== 'dUBN7kVkrAYFaaCl3Fw9jb2B46JZY'
    ) {
      return NextResponse.json({ error: 'Scoped token mismatch' }, { status: 403 })
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
        .limit(10)
        .find()
      row = pickBestPaymentRow((found.items ?? []) as Array<Record<string, unknown>>)
      if (!row) {
        const found2 = await client.items
          .query('Payments')
          .limit(80)
          .descending('_createdDate')
          .find()
        const matches = ((found2.items ?? []) as Array<Record<string, unknown>>).filter(
          (item) => {
            const tx = String(item.transactionId || item.squarePaymentId || '')
            return tx === transactionId || tx.startsWith(`${transactionId}:`)
          },
        )
        row = pickBestPaymentRow(matches)
      }
    }

    if (!row) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const parentEmail = String(row.parentEmail || row.email || '').trim()
    if (!parentEmail || parentEmail === 'guest@register.local') {
      return NextResponse.json(
        { error: 'Payment has no parent email (or is a guest Stand row)' },
        { status: 400 },
      )
    }

    const amount = amountFromRow(row, body.amount)
    let description = String(
      body.description ||
        row.description ||
        row.programName ||
        row.programTitle ||
        'SHMS PTO purchase',
    ).trim()
    // Prefer website cart/program wording over poisoned Stand ledger titles
    if (/in-person sales|square stand/i.test(description) && !body.description) {
      const notes = String(row.notes || '')
      if (/enrichment|bag|competitive math|robotics/i.test(notes)) {
        description = 'Enrichment enrollment'
      }
    }
    const tx = String(row.transactionId || row.squarePaymentId || transactionId || paymentId)
    let programName = String(
      body.programName || row.programName || row.programTitle || '',
    ).trim()
    if (/in-person sales|square stand/i.test(programName) && body.programName) {
      programName = body.programName
    } else if (/in-person sales|square stand/i.test(programName)) {
      programName = body.programName || description
    }
    const kind = (body.kind as PurchaseConfirmKind | undefined) || kindFromPayment(row)
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
      parentName:
        String(body.parentName || row.parentName || row.studentName || '').trim() ||
        undefined,
      amount,
      description,
      transactionId: tx,
      meta: programName ? { programName } : undefined,
      extras: Object.keys(extras).length ? extras : undefined,
      skipStaffNotify: body.notifyStaff !== true,
    })

    return NextResponse.json({
      ok: true,
      emailed: confirmation.emailed,
      subject: confirmation.subject,
      parentEmail,
      transactionId: tx,
      kind,
      amount,
      description,
      staffNotified: body.notifyStaff === true,
      source: String(row.source || ''),
    })
  } catch (err) {
    const eventId = await reportError(err, { route: '/api/cron/resend-purchase-confirmation' })
    return NextResponse.json(
      { error: 'Resend failed', eventId },
      { status: 500 },
    )
  }
}
