'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ADJUSTMENT_LABELS,
  ADJUSTMENT_TYPES,
  type AdjustmentType,
  defaultAmountMode,
  defaultDestination,
  type RefundDestination,
} from '@/lib/refunds/types'
import { remainingRefundableDollars } from '@/lib/refunds/refund-amount'

export type RefundPaymentSummary = {
  id: string
  programName: string
  amount: number
  paymentMethod: string
  parentEmail?: string
  payerEmail?: string
  payerName?: string
  refundStatus?: string
  refundedAmountDollars?: number
}

type Props = {
  payment: RefundPaymentSummary | null
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

export function StaffRefundRequestDialog({ payment, open, onClose, onSubmitted }: Props) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('refund_full')
  const [amountMode, setAmountMode] = useState<'full' | 'partial'>('full')
  const [customAmount, setCustomAmount] = useState('')
  const [destination, setDestination] = useState<RefundDestination>('payment_method')
  const [exchangeNote, setExchangeNote] = useState('')
  const [rebilledAmount, setRebilledAmount] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remaining = useMemo(() => {
    if (!payment) return 0
    return remainingRefundableDollars(payment.amount, payment.refundedAmountDollars ?? 0)
  }, [payment])

  useEffect(() => {
    if (!open || !payment) return
    setAdjustmentType('refund_full')
    setAmountMode('full')
    setCustomAmount(remaining > 0 ? remaining.toFixed(2) : '')
    setDestination('payment_method')
    setExchangeNote('')
    setRebilledAmount('')
    setRequestNote('')
    setStaffNote('')
    setError('')
  }, [open, payment, remaining])

  useEffect(() => {
    setAmountMode(defaultAmountMode(adjustmentType))
    setDestination(defaultDestination(adjustmentType))
  }, [adjustmentType])

  if (!open || !payment) return null

  const parentLabel = payment.parentEmail || payment.payerEmail || payment.payerName || 'Parent'
  const showExchangeFields =
    adjustmentType === 'exchange_equal' ||
    adjustmentType === 'exchange_upgrade' ||
    adjustmentType === 'exchange_downgrade'
  const showRebill = adjustmentType === 'exchange_upgrade'
  const showDestination = adjustmentType !== 'store_credit' && !payment.programName.includes('reload')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const body: Record<string, string> = {
        paymentId: payment!.id,
        requestNote,
        staffNote,
        adjustmentType,
        refundDestination: destination,
        amountMode,
      }
      if (amountMode === 'partial') body.refundAmountDollars = customAmount.trim()
      if (showExchangeFields && exchangeNote.trim()) body.exchangeNote = exchangeNote.trim()
      if (showRebill && rebilledAmount.trim()) body.rebilledAmountDollars = rebilledAmount.trim()

      const r = await fetch('/api/staff/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Request failed')
      onSubmitted?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-dialog-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <h3 id="refund-dialog-title" className="text-lg font-bold">
              Request refund / exchange
            </h3>
            <p className="text-xs text-[#5A6070] mt-1">
              ${payment.amount.toFixed(2)} · {payment.programName || 'Payment'}
              {'\n'}
              {parentLabel} · {payment.paymentMethod}
            </p>
            {remaining < payment.amount ? (
              <p className="text-xs text-sky-800 mt-1">
                Up to ${remaining.toFixed(2)} remaining on this charge.
              </p>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <label className="block text-xs font-semibold text-[#5A6070]">
          Adjustment type
          <select
            className="hsk-input mt-1 w-full"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
          >
            {ADJUSTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ADJUSTMENT_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#5A6070]">Refund amount</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="amountMode"
              checked={amountMode === 'full'}
              onChange={() => setAmountMode('full')}
            />
            Full remaining (${remaining.toFixed(2)})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="amountMode"
              checked={amountMode === 'partial'}
              onChange={() => setAmountMode('partial')}
            />
            Custom amount
          </label>
          {amountMode === 'partial' ? (
            <input
              className="hsk-input w-full"
              type="number"
              min={0.01}
              max={remaining}
              step={0.01}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Max $${remaining.toFixed(2)}`}
            />
          ) : null}
        </div>

        {showDestination ? (
          <label className="block text-xs font-semibold text-[#5A6070]">
            Where value goes back
            <select
              className="hsk-input mt-1 w-full"
              value={destination}
              onChange={(e) => setDestination(e.target.value as RefundDestination)}
            >
              <option value="payment_method">Original payment method (Square / PayPal)</option>
              <option value="cove_balance">Cove Digital Card balance</option>
            </select>
          </label>
        ) : null}

        {showExchangeFields ? (
          <label className="block text-xs font-semibold text-[#5A6070]">
            Exchange details (size, item, pickup plan)
            <textarea
              className="hsk-input mt-1 min-h-[72px] w-full"
              value={exchangeNote}
              onChange={(e) => setExchangeNote(e.target.value)}
              placeholder="Wrong size → exchange for M at pickup Friday…"
            />
          </label>
        ) : null}

        {showRebill ? (
          <label className="block text-xs font-semibold text-[#5A6070]">
            New charge amount (collect separately after approval)
            <input
              className="hsk-input mt-1 w-full"
              type="number"
              min={0}
              step={0.01}
              value={rebilledAmount}
              onChange={(e) => setRebilledAmount(e.target.value)}
              placeholder="Difference parent will pay for upgrade"
            />
          </label>
        ) : null}

        <label className="block text-xs font-semibold text-[#5A6070]">
          Parent&apos;s written request (email or portal message)
          <textarea
            className="hsk-input mt-1 min-h-[88px] w-full"
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder="Paste what the parent wrote…"
          />
        </label>

        <label className="block text-xs font-semibold text-[#5A6070]">
          Staff note (optional)
          <input
            className="hsk-input mt-1 w-full"
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder="Handed out already, wrong SKU, etc."
          />
        </label>

        {error ? <p className="text-xs text-red-700">{error}</p> : null}

        <Button
          disabled={busy || requestNote.trim().length < 8}
          className="w-full text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
          onClick={() => void submit()}
        >
          Send to president for approval
        </Button>
      </div>
    </div>
  )
}
