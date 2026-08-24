/**
 * GET  /api/staff/refunds?view=payments&q=… — search refundable payments
 * GET  /api/staff/refunds?view=queue&status=pending — approval queue (admin)
 * POST /api/staff/refunds { paymentId, requestNote, staffNote?, adjustmentType?, … }
 * PATCH /api/staff/refunds { action: 'approve'|'deny', paymentId, denyReason?, refundAmountDollars? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { isInstructorStaffOnly, type StaffProfile } from '@/lib/staff/roles'
import { getWixClient } from '@/lib/wix-client'
import { processPaymentRefund, type PaymentRefundRow } from '@/lib/refunds/process-refund'
import {
  parseRefundAmountDollars,
  remainingRefundableDollars,
  resolveRefundAmountDollars,
} from '@/lib/refunds/refund-amount'
import {
  ADJUSTMENT_TYPES,
  canRequestRefund,
  isAdjustmentType,
  REFUND_DESTINATIONS,
  type RefundDestination,
} from '@/lib/refunds/types'

export const dynamic = 'force-dynamic'

const REQUEST_ROLES = ['retail', 'treasurer', 'programs', 'events', 'membership', 'admin', 'secretary'] as const

function canRequestRefundRole(staff: StaffProfile) {
  if (isInstructorStaffOnly(staff.roles)) return false
  return requireStaffRole(staff, [...REQUEST_ROLES])
}

function mapPayment(row: Record<string, unknown>) {
  const amount = Number(row.amount ?? 0) || 0
  const refundedAmountDollars = parseRefundAmountDollars(row.refundedAmountDollars) ?? 0
  return {
    id: String(row._id ?? ''),
    programName: String(row.programName ?? ''),
    amount,
    status: String(row.status ?? ''),
    paymentDate: row.paymentDate ? new Date(String(row.paymentDate)).toISOString() : '',
    paymentMethod: String(row.paymentMethod ?? ''),
    transactionId: String(row.transactionId ?? ''),
    source: String(row.source ?? ''),
    parentEmail: String(row.parentEmail ?? row.payerEmail ?? ''),
    payerName: String(row.payerName ?? ''),
    notes: String(row.notes ?? ''),
    refundStatus: String(row.refundStatus ?? ''),
    refundRequestNote: String(row.refundRequestNote ?? ''),
    refundStaffNote: String(row.refundStaffNote ?? ''),
    refundRequestedBy: String(row.refundRequestedBy ?? ''),
    refundRequestedAt: row.refundRequestedAt
      ? new Date(String(row.refundRequestedAt)).toISOString()
      : '',
    refundApprovedBy: String(row.refundApprovedBy ?? ''),
    refundDeniedReason: String(row.refundDeniedReason ?? ''),
    refundProviderId: String(row.refundProviderId ?? ''),
    refundError: String(row.refundError ?? ''),
    refundAmountDollars: String(row.refundAmountDollars ?? ''),
    refundedAmountDollars,
    remainingRefundable: remainingRefundableDollars(amount, refundedAmountDollars),
    adjustmentType: String(row.adjustmentType ?? ''),
    refundDestination: String(row.refundDestination ?? ''),
    exchangeNote: String(row.exchangeNote ?? ''),
    rebilledAmountDollars: String(row.rebilledAmountDollars ?? ''),
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const view = req.nextUrl.searchParams.get('view') || 'queue'
  const client = getWixClient()

  try {
    if (view === 'payments') {
      if (!canRequestRefundRole(session.staff)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
      const result = await client.items.query('Payments').descending('paymentDate').limit(100).find()
      let payments = (result.items ?? []).map((item) => mapPayment(item as Record<string, unknown>))
      payments = payments.filter(
        (p) =>
          (p.status === 'Paid' || p.status === 'Needs Reconciliation') &&
          canRequestRefund(p.refundStatus, p.amount, p.refundedAmountDollars),
      )
      if (q) {
        payments = payments.filter(
          (p) =>
            p.parentEmail.toLowerCase().includes(q) ||
            p.programName.toLowerCase().includes(q) ||
            p.transactionId.toLowerCase().includes(q) ||
            p.source.toLowerCase().includes(q),
        )
      }
      return NextResponse.json({ payments: payments.slice(0, 40) })
    }

    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const isAdmin = requireStaffRole(session.staff, ['admin'])
    let query = client.items.query('Payments').descending('refundRequestedAt').limit(80)
    if (status === 'pending') {
      query = query.eq('refundStatus', 'pending')
    } else if (status !== 'all') {
      query = query.eq('refundStatus', status)
    }
    const result = await query.find()
    let items = (result.items ?? []).map((item) => mapPayment(item as Record<string, unknown>))
    if (!isAdmin) {
      const me = session.staff.email.trim().toLowerCase()
      items = items.filter((p) => p.refundRequestedBy.toLowerCase() === me)
    }
    return NextResponse.json({ items, isAdmin })
  } catch (err) {
    console.error('/api/staff/refunds GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load refunds' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canRequestRefundRole(session.staff)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const paymentId = String(body.paymentId ?? '').trim()
    const requestNote = String(body.requestNote ?? '').trim()
    const staffNote = String(body.staffNote ?? '').trim()
    const adjustmentTypeRaw = String(body.adjustmentType ?? 'refund_full').trim()
    const adjustmentType = isAdjustmentType(adjustmentTypeRaw) ? adjustmentTypeRaw : 'refund_full'
    const amountMode = String(body.amountMode ?? 'full').trim() === 'partial' ? 'partial' : 'full'
    const destinationRaw = String(body.refundDestination ?? 'payment_method').trim()
    const refundDestination: RefundDestination = (REFUND_DESTINATIONS as readonly string[]).includes(
      destinationRaw,
    )
      ? (destinationRaw as RefundDestination)
      : 'payment_method'
    const exchangeNote = String(body.exchangeNote ?? '').trim()
    const rebilledAmountDollars = String(body.rebilledAmountDollars ?? '').trim()

    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    if (!requestNote || requestNote.length < 8) {
      return NextResponse.json(
        { error: 'Paste the parent’s written refund request (email or portal message).' },
        { status: 400 },
      )
    }

    const client = getWixClient()
    const existing = (await client.items.get('Payments', paymentId)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const status = String(existing.status ?? '')
    const refundStatus = String(existing.refundStatus ?? '')
    const amount = Number(existing.amount ?? 0) || 0
    const priorRefunded = parseRefundAmountDollars(existing.refundedAmountDollars) ?? 0

    if (refundStatus === 'refunded' || status === 'Refunded') {
      return NextResponse.json({ error: 'Already fully refunded' }, { status: 409 })
    }
    if (refundStatus === 'pending') {
      return NextResponse.json({ error: 'Refund already pending approval' }, { status: 409 })
    }
    if (!canRequestRefund(refundStatus, amount, priorRefunded)) {
      return NextResponse.json({ error: 'Nothing left to refund on this payment' }, { status: 400 })
    }
    if (status !== 'Paid' && status !== 'Needs Reconciliation') {
      return NextResponse.json({ error: `Cannot refund payment in status “${status}”` }, { status: 400 })
    }

    let refundAmountDollars: number
    try {
      refundAmountDollars = resolveRefundAmountDollars({
        paymentAmount: amount,
        refundedAmountDollars: priorRefunded,
        requestedAmountDollars: parseRefundAmountDollars(body.refundAmountDollars),
        mode: amountMode,
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid refund amount' },
        { status: 400 },
      )
    }

    if (!ADJUSTMENT_TYPES.includes(adjustmentType)) {
      return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 })
    }

    const now = new Date().toISOString()
    await client.items.update('Payments', {
      ...existing,
      _id: paymentId,
      refundStatus: 'pending',
      refundRequestNote: requestNote,
      refundStaffNote: staffNote,
      refundRequestedBy: session.staff.email || session.email,
      refundRequestedAt: now,
      refundApprovedBy: '',
      refundApprovedAt: '',
      refundDeniedReason: '',
      refundError: '',
      refundAmountDollars: String(refundAmountDollars),
      adjustmentType,
      refundDestination,
      exchangeNote,
      rebilledAmountDollars,
    } as never)

    return NextResponse.json({ ok: true, paymentId, refundStatus: 'pending', refundAmountDollars })
  } catch (err) {
    console.error('/api/staff/refunds POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not request refund' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['admin'])) {
    return NextResponse.json({ error: 'President approval required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const paymentId = String(body.paymentId ?? '').trim()
    const action = String(body.action ?? '').trim()
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })

    const client = getWixClient()
    const existing = (await client.items.get('Payments', paymentId)) as Record<string, unknown>
    if (!existing?._id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    if (String(existing.refundStatus ?? '') !== 'pending') {
      return NextResponse.json({ error: 'No pending refund on this payment' }, { status: 400 })
    }

    const approver = session!.staff!.email || session!.email

    if (action === 'deny') {
      const denyReason = String(body.denyReason ?? '').trim() || 'Refund not approved'
      await client.items.update('Payments', {
        ...existing,
        _id: paymentId,
        refundStatus: 'denied',
        refundDeniedReason: denyReason,
        refundApprovedBy: approver,
        refundApprovedAt: new Date().toISOString(),
      } as never)
      return NextResponse.json({ ok: true, refundStatus: 'denied' })
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'action must be approve or deny' }, { status: 400 })
    }

    const overrideAmount = parseRefundAmountDollars(body.refundAmountDollars)

    try {
      const result = await processPaymentRefund(existing as PaymentRefundRow, {
        approvedBy: approver,
        idempotencyKey: `refund-${paymentId}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45),
        overrideRefundAmountDollars: overrideAmount,
      })
      return NextResponse.json({ ok: true, refundStatus: result.isFullRefund ? 'refunded' : 'partial', ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed'
      await client.items.update('Payments', {
        ...existing,
        _id: paymentId,
        refundStatus: 'failed',
        refundError: message,
        refundApprovedBy: approver,
        refundApprovedAt: new Date().toISOString(),
      } as never)
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (err) {
    console.error('/api/staff/refunds PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not process refund' },
      { status: 500 },
    )
  }
}
