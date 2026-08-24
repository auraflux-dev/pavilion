import { getWixClient } from '@/lib/wix-client'
import {
  listFamilyStudents,
  resolveFamilyGiftCard,
  syncFamilyStoreCard,
} from '@/lib/family-store-card'
import { parsePaymentNotes } from '@/lib/refunds/parse-payment-notes'
import {
  dollarsToCents,
  parseRefundAmountDollars,
  remainingRefundableDollars,
  scaleRefundSplit,
} from '@/lib/refunds/refund-amount'
import { ADJUSTMENT_LABELS, type AdjustmentType, type RefundDestination } from '@/lib/refunds/types'
import { refundPayPalCapture } from '@/lib/paypal'
import { loadGiftCard, redeemGiftCard, refundPayment } from '@/lib/square'
import { promoteFirstWaitlisted } from '@/lib/programs/enrollments'

export type PaymentRefundRow = {
  _id: string
  programName?: string
  amount?: number
  status?: string
  paymentMethod?: string
  transactionId?: string
  source?: string
  parentEmail?: string
  studentId?: string
  notes?: string
  refundStatus?: string
  refundAmountDollars?: string
  refundedAmountDollars?: string
  adjustmentType?: string
  refundDestination?: string
  exchangeNote?: string
  rebilledAmountDollars?: string
}

function isPayPalPayment(row: PaymentRefundRow) {
  const source = String(row.source ?? '').toLowerCase()
  const method = String(row.paymentMethod ?? '').toLowerCase()
  return source.startsWith('paypal_') || method.includes('paypal')
}

async function creditCoveBalance(parentEmail: string, coveCents: number, idempotencyKey: string) {
  const family = await listFamilyStudents(parentEmail)
  const card = resolveFamilyGiftCard(family)
  const gan = card.gan.trim()
  if (!gan) throw new Error('Family has no Cove Digital Card to credit')
  const activity = await loadGiftCard(gan, coveCents, idempotencyKey, ['refund-credit'])
  const newBalance = activity?.giftCardBalanceMoney
    ? Number(activity.giftCardBalanceMoney.amount) / 100
    : card.balance + coveCents / 100
  await syncFamilyStoreCard({
    parentEmail,
    gan,
    giftCardId: card.giftCardId,
    balanceDollars: newBalance,
  })
}

async function debitCoveLoad(parentEmail: string, redeemCents: number, idempotencyKey: string) {
  const family = await listFamilyStudents(parentEmail)
  const card = resolveFamilyGiftCard(family)
  const gan = card.gan.trim()
  if (!gan) throw new Error('Family has no Cove Digital Card to debit')
  const activity = await redeemGiftCard(gan, redeemCents, idempotencyKey)
  const newBalance = activity?.giftCardBalanceMoney
    ? Number(activity.giftCardBalanceMoney.amount) / 100
    : Math.max(0, card.balance - redeemCents / 100)
  await syncFamilyStoreCard({
    parentEmail,
    gan,
    giftCardId: card.giftCardId,
    balanceDollars: newBalance,
  })
}

async function markProgramEnrollmentRefunded(transactionId: string, approvedBy: string, partial: boolean) {
  if (!transactionId) return
  const client = getWixClient()
  const found = await client.items
    .query('ProgramEnrollments')
    .eq('transactionId', transactionId)
    .limit(5)
    .find()
  for (const item of found.items ?? []) {
    const row = item as Record<string, unknown>
    const id = String(row._id ?? '')
    const programId = String(row.programId ?? '')
    const previousStatus = String(row.status ?? '')
    if (!id || previousStatus === 'Refunded') continue
    if (partial) {
      await client.items.update('ProgramEnrollments', {
        ...row,
        _id: id,
        refundNote: `Partial refund processed by ${approvedBy}`,
        refundedAt: new Date().toISOString(),
        refundedByEmail: approvedBy,
      } as never)
      continue
    }
    await client.items.update('ProgramEnrollments', {
      ...row,
      _id: id,
      status: 'Refunded',
      waitlistPosition: null,
      refundNote: `Payment refunded by ${approvedBy}`,
      refundedAt: new Date().toISOString(),
      refundedByEmail: approvedBy,
    } as never)
    if (programId) {
      await promoteFirstWaitlisted(programId).catch(() => null)
    }
  }
}

function parentMessageCopy(opts: {
  adjustmentType: AdjustmentType
  label: string
  refundAmount: number
  method: string
  refundProviderId: string
  destination: RefundDestination
  exchangeNote: string
  rebilledAmount: number | null
  isFullRefund: boolean
}) {
  const typeLabel = ADJUSTMENT_LABELS[opts.adjustmentType] || 'Refund'
  const dest =
    opts.destination === 'cove_balance'
      ? 'your Cove Digital Card balance'
      : opts.method || 'your original payment method'

  const lines = [`${typeLabel} for ${opts.label} ($${opts.refundAmount.toFixed(2)}) was approved.`]

  if (opts.destination === 'cove_balance') {
    lines.push(`$${opts.refundAmount.toFixed(2)} was added to ${dest}.`)
  } else {
    lines.push(`$${opts.refundAmount.toFixed(2)} was sent back to ${dest}.`)
  }

  if (opts.refundProviderId) lines.push(`Reference: ${opts.refundProviderId}`)
  if (opts.exchangeNote.trim()) {
    lines.push('', 'Exchange / fulfillment:', opts.exchangeNote.trim())
  }
  if (opts.rebilledAmount != null && opts.rebilledAmount > 0) {
    lines.push(
      '',
      `Staff will collect $${opts.rebilledAmount.toFixed(2)} separately for the upgrade.`,
    )
  }
  if (!opts.isFullRefund) {
    lines.push('', 'This was a partial refund. The original charge may still show a remaining balance.')
  }
  lines.push(
    '',
    'It may take a few business days to appear on your statement or Cove balance.',
    'Questions? Reply to this message or email treasurer@shmspto.org.',
  )
  return {
    subject: `${opts.isFullRefund ? 'Refund' : 'Partial refund'} processed: ${opts.label}`,
    body: lines.join('\n'),
  }
}

async function notifyParentRefund(parentEmail: string, copy: { subject: string; body: string }) {
  const email = parentEmail.trim().toLowerCase()
  if (!email) return
  const client = getWixClient()
  await client.items.insert('ParentMessages', {
    parentEmail: email,
    audience: 'family',
    grade: null,
    studentId: null,
    studentName: null,
    programName: '',
    fromName: 'SHMS PTO',
    subject: copy.subject,
    body: copy.body,
    sentAt: new Date().toISOString(),
    active: true,
  })
}

export async function processPaymentRefund(
  payment: PaymentRefundRow,
  opts: {
    approvedBy: string
    idempotencyKey: string
    overrideRefundAmountDollars?: number | null
  },
) {
  const refundStatus = String(payment.refundStatus ?? '').trim()
  if (refundStatus === 'refunded') throw new Error('This payment was already fully refunded')

  const amount = Number(payment.amount ?? 0)
  if (!(amount > 0)) throw new Error('Invalid payment amount')

  const priorRefunded = parseRefundAmountDollars(payment.refundedAmountDollars) ?? 0
  const requestedStored = parseRefundAmountDollars(payment.refundAmountDollars)
  const refundAmountDollars =
    opts.overrideRefundAmountDollars ??
    requestedStored ??
    remainingRefundableDollars(amount, priorRefunded)

  if (refundAmountDollars <= 0) throw new Error('Invalid refund amount')
  const remaining = remainingRefundableDollars(amount, priorRefunded)
  if (refundAmountDollars > remaining + 0.001) {
    throw new Error(`Maximum refundable is $${remaining.toFixed(2)}`)
  }

  const transactionId = String(payment.transactionId ?? '').trim()
  const parentEmail = String(payment.parentEmail ?? '').trim().toLowerCase()
  const source = String(payment.source ?? '')
  const adjustmentType = (String(payment.adjustmentType ?? 'refund_full') ||
    'refund_full') as AdjustmentType
  const destination = (String(payment.refundDestination ?? 'payment_method') ||
    'payment_method') as RefundDestination
  const exchangeNote = String(payment.exchangeNote ?? '')
  const rebilledAmount = parseRefundAmountDollars(payment.rebilledAmountDollars)
  const payPal = isPayPalPayment(payment)

  const parsed = parsePaymentNotes(String(payment.notes ?? ''), amount)
  let { coveCents, cardCents, loadedCents } = scaleRefundSplit({
    totalAmountDollars: amount,
    refundAmountDollars,
    ...parsed,
  })

  const refundCents = dollarsToCents(refundAmountDollars)
  let refundProviderId = ''

  if (destination === 'cove_balance') {
    if (!parentEmail) throw new Error('Cove credit refund needs parentEmail')
    await creditCoveBalance(
      parentEmail,
      refundCents,
      `${opts.idempotencyKey}-cove-credit`.slice(0, 45),
    )
    cardCents = 0
    coveCents = 0
  } else if (source.includes('store_card_reload')) {
    const redeemCents = loadedCents > 0 ? loadedCents : refundCents
    if (!parentEmail) throw new Error('Store-card refund needs parentEmail')
    await debitCoveLoad(parentEmail, redeemCents, `${opts.idempotencyKey}-cove-debit`.slice(0, 45))
    cardCents = 0
  } else {
    if (coveCents > 0) {
      if (!parentEmail) throw new Error('Split Cove refund needs parentEmail')
      await creditCoveBalance(
        parentEmail,
        coveCents,
        `${opts.idempotencyKey}-cove-credit`.slice(0, 45),
      )
    }

    if (cardCents > 0) {
      if (!transactionId) throw new Error('Payment has no processor transaction id')
      if (payPal) {
        const refund = await refundPayPalCapture({
          captureId: transactionId,
          amountCents: cardCents,
          idempotencyKey: `${opts.idempotencyKey}-paypal`.slice(0, 45),
        })
        refundProviderId = refund.id
      } else {
        const refund = await refundPayment({
          paymentId: transactionId,
          amountCents: cardCents,
          idempotencyKey: `${opts.idempotencyKey}-square`.slice(0, 45),
        })
        refundProviderId = String(refund?.id ?? refund?.refundId ?? '')
      }
    } else if (coveCents <= 0 && refundCents > 0) {
      if (!transactionId) throw new Error('Payment has no processor transaction id')
      if (payPal) {
        const refund = await refundPayPalCapture({
          captureId: transactionId,
          amountCents: refundCents,
          idempotencyKey: `${opts.idempotencyKey}-paypal`.slice(0, 45),
        })
        refundProviderId = refund.id
      } else {
        const refund = await refundPayment({
          paymentId: transactionId,
          amountCents: refundCents,
          idempotencyKey: `${opts.idempotencyKey}-square`.slice(0, 45),
        })
        refundProviderId = String(refund?.id ?? refund?.refundId ?? '')
      }
    }
  }

  const newRefundedTotal = Math.round((priorRefunded + refundAmountDollars) * 100) / 100
  const isFullRefund = newRefundedTotal >= amount - 0.009

  if (source.includes('program')) {
    await markProgramEnrollmentRefunded(transactionId, opts.approvedBy, !isFullRefund)
  }

  const client = getWixClient()
  const paymentId = String(payment._id)
  const existing = (await client.items.get('Payments', paymentId)) as Record<string, unknown>
  await client.items.update('Payments', {
    ...existing,
    _id: paymentId,
    status: isFullRefund ? 'Refunded' : String(existing.status ?? 'Paid'),
    refundStatus: isFullRefund ? 'refunded' : 'partial',
    refundApprovedBy: opts.approvedBy,
    refundApprovedAt: new Date().toISOString(),
    refundProviderId,
    refundError: '',
    refundedAmountDollars: String(newRefundedTotal),
    refundAmountDollars: String(refundAmountDollars),
    notes: [
      String(existing.notes ?? ''),
      `${isFullRefund ? 'Refunded' : 'Partial refund'} $${refundAmountDollars.toFixed(2)} ${new Date().toISOString()} by ${opts.approvedBy}`,
    ]
      .filter(Boolean)
      .join(' · '),
  } as never)

  if (parentEmail) {
    const method = String(payment.paymentMethod ?? 'original payment method')
    const label = String(payment.programName ?? 'your purchase')
    await notifyParentRefund(
      parentEmail,
      parentMessageCopy({
        adjustmentType,
        label,
        refundAmount: refundAmountDollars,
        method,
        refundProviderId,
        destination,
        exchangeNote,
        rebilledAmount,
        isFullRefund,
      }),
    )
  }

  return {
    refundProviderId,
    refundAmountDollars,
    isFullRefund,
    cardCents,
    coveCents,
    loadedCents,
  }
}
