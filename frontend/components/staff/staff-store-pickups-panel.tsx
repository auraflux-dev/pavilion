'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  StaffRefundRequestDialog,
  type RefundPaymentSummary,
} from '@/components/staff/staff-refund-request-dialog'
import { StaffRefundStatusBadge } from '@/components/staff/staff-refund-status-badge'
import { canRequestRefund } from '@/lib/refunds/types'

type PickupItem = {
  id: string
  parentEmail: string
  productLabel: string
  amount: number
  paymentDate: string
  paymentMethod: string
  handedOut: boolean
  refundStatus: string
  refundedAmountDollars: number
}

function formatDateTimeEt(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Open online Cove snack & spirit pickups (portal/site). Not membership perks.
 */
export function StaffStorePickupsPanel() {
  const [items, setItems] = useState<PickupItem[]>([])
  const [dateEt, setDateEt] = useState('')
  const [windowLabel, setWindowLabel] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [refundPayment, setRefundPayment] = useState<RefundPaymentSummary | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/cove/store-pickups')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setItems(d.items ?? [])
      setDateEt(String(d.dateEt ?? ''))
      setWindowLabel(String(d.windowLabel ?? ''))
      setPendingCount(Number(d.pendingCount) || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(id)
  }, [load])

  async function mark(item: PickupItem, action: 'handed_out' | 'undo') {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/store-pickups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(
        action === 'handed_out'
          ? `Handed out ${item.productLabel} → ${item.parentEmail || 'guest'}`
          : `Back to pending · ${item.productLabel}`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const pending = items.filter((i) => !i.handedOut)
  const done = items.filter((i) => i.handedOut)

  return (
    <section
      id="cove-store-pickups"
      className="scroll-mt-28 rounded-xl border-2 border-[var(--brand-green)] bg-white p-4 sm:p-5 space-y-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-green)]">
            Fulfillment · online orders
          </p>
          <h2 className="text-lg font-bold flex items-center gap-2 mt-0.5">
            <Package className="w-5 h-5" style={{ color: 'var(--brand-green)' }} />
            Store pickups
            {pendingCount > 0 ? (
              <span className="text-sm font-bold tabular-nums text-amber-800">
                · {pendingCount} waiting
              </span>
            ) : null}
          </h2>
          <p className="text-xs text-[#5A6070] mt-1 max-w-xl leading-relaxed">
            Paid portal / site snack &amp; spirit orders waiting for handoff
            {dateEt ? ` (as of ${dateEt} ET)` : ''}.{' '}
            {windowLabel ||
              'Membership shirts & magnets stay under Membership → Fulfillment.'}{' '}
            Mark <strong>Handed out</strong> when you pass the item. Not for Square Stand sales.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {pending.length === 0 && done.length === 0 ? (
        <p className="text-sm text-[#5A6070]">
          No open online Cove snack or spirit pickups. Membership shirts &amp; magnets are under{' '}
          Membership → Fulfillment.
        </p>
      ) : null}

      {pending.length > 0 ? (
        <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 bg-white"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#1A1A1A]">{item.productLabel}</p>
                  <StaffRefundStatusBadge
                    refundStatus={item.refundStatus}
                    amount={item.amount}
                    refundedAmountDollars={item.refundedAmountDollars}
                  />
                </div>
                <p className="text-xs text-[#5A6070]">
                  {item.parentEmail || 'no email'} · ${item.amount.toFixed(2)} ·{' '}
                  {formatDateTimeEt(item.paymentDate)}
                  {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canRequestRefund(item.refundStatus, item.amount, item.refundedAmountDollars) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || item.refundStatus === 'pending'}
                    onClick={() => {
                      setRefundPayment({
                        id: item.id,
                        programName: item.productLabel,
                        amount: item.amount,
                        paymentMethod: item.paymentMethod,
                        parentEmail: item.parentEmail,
                        refundStatus: item.refundStatus,
                        refundedAmountDollars: item.refundedAmountDollars,
                      })
                      setRefundOpen(true)
                    }}
                  >
                    Refund
                  </Button>
                ) : null}
                <Button
                type="button"
                disabled={busy}
                className="text-white font-bold"
                style={{ backgroundColor: 'var(--brand-green)' }}
                onClick={() => void mark(item, 'handed_out')}
              >
                <Check className="w-4 h-4 mr-1" />
                Handed out
              </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <details className="rounded-xl border border-[var(--border)] bg-white group">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-[#5A6070] flex items-center justify-between gap-2">
            <span>Show recently handed out ({done.length})</span>
            <span className="font-bold group-open:hidden">Show</span>
            <span className="font-bold hidden group-open:inline">Hide</span>
          </summary>
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-white">
            {done.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#1A1A1A]">
                    {item.productLabel}{' '}
                    <span className="text-xs text-[#5A6070]">
                      · {item.parentEmail || 'no email'} · {formatDateTimeEt(item.paymentDate)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="text-[11px] font-bold underline text-[#5A6070]"
                  onClick={() => void mark(item, 'undo')}
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs font-semibold text-green-700">{status}</p> : null}

      <StaffRefundRequestDialog
        payment={refundPayment}
        open={refundOpen}
        onClose={() => {
          setRefundOpen(false)
          setRefundPayment(null)
        }}
        onSubmitted={async () => {
          setStatus('Refund request sent to president for approval.')
          await load()
        }}
      />
    </section>
  )
}
