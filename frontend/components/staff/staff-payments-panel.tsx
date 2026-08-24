'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  StaffRefundRequestDialog,
  type RefundPaymentSummary,
} from '@/components/staff/staff-refund-request-dialog'
import { StaffRefundStatusBadge } from '@/components/staff/staff-refund-status-badge'
import { ADJUSTMENT_LABELS, canRequestRefund } from '@/lib/refunds/types'
import type { PaymentsListRange } from '@/lib/staff/payments-list-range'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
  STAFF_FILTER_SELECT,
} from '@/lib/staff/staff-filter-ui'

type Payment = {
  id: string
  studentId: string
  programName: string
  amount: number
  status: string
  paymentDate: string
  paymentMethod: string
  transactionId: string
  source: string
  payerEmail: string
  parentEmail: string
  payerName: string
  refundStatus: string
  refundedAmountDollars: number
}

type QueueRow = {
  id: string
  programName: string
  amount: number
  paymentDate: string
  paymentMethod: string
  parentEmail: string
  refundRequestNote: string
  refundStaffNote: string
  refundRequestedBy: string
  refundRequestedAt: string
  refundAmountDollars: string
  adjustmentType: string
  refundDestination: string
  exchangeNote: string
  rebilledAmountDollars: string
  refundError: string
}

type Props = {
  isAdmin?: boolean
}

const RANGE_CHIPS: { id: PaymentsListRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All' },
]

export function StaffPaymentsPanel({ isAdmin = false }: Props) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [onlyNeeds, setOnlyNeeds] = useState(false)
  const [range, setRange] = useState<PaymentsListRange>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [account, setAccount] = useState('')
  const [accountApplied, setAccountApplied] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [nameApplied, setNameApplied] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [emailApplied, setEmailApplied] = useState('')
  const [itemFilter, setItemFilter] = useState('')
  const [itemApplied, setItemApplied] = useState('')
  const [amount, setAmount] = useState('')
  const [amountApplied, setAmountApplied] = useState('')
  const [sort, setSort] = useState<'date' | 'amount' | 'name' | 'item'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [truncated, setTruncated] = useState(false)
  const [rangeLabel, setRangeLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [refundPayment, setRefundPayment] = useState<RefundPaymentSummary | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('needs', onlyNeeds ? 'true' : 'false')
      if (!onlyNeeds) {
        params.set('range', range)
        if (range === 'custom') {
          if (customFrom) params.set('from', customFrom)
          if (customTo) params.set('to', customTo)
        }
      }
      if (accountApplied) params.set('account', accountApplied)
      if (nameApplied) params.set('name', nameApplied)
      if (emailApplied) params.set('email', emailApplied)
      if (itemApplied) params.set('item', itemApplied)
      if (amountApplied) params.set('amount', amountApplied)
      params.set('sort', sort)
      params.set('dir', sortDir)
      params.set('page', String(page))
      params.set('pageSize', '25')

      const r = await fetch(`/api/staff/payments?${params.toString()}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setPayments(d.payments ?? [])
      setTotal(Number(d.total) || 0)
      setPageSize(Number(d.pageSize) || 25)
      setTruncated(Boolean(d.truncated))
      if (d.from && d.to) {
        setRangeLabel(d.from === d.to ? d.from : `${d.from} to ${d.to}`)
      } else {
        setRangeLabel('')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [
    onlyNeeds,
    range,
    customFrom,
    customTo,
    accountApplied,
    nameApplied,
    emailApplied,
    itemApplied,
    amountApplied,
    sort,
    sortDir,
    page,
  ])

  const loadQueue = useCallback(async () => {
    if (!isAdmin) return
    try {
      const r = await fetch('/api/staff/refunds?view=queue&status=pending')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setQueue(d.items ?? [])
    } catch {
      /* queue optional */
    }
  }, [isAdmin])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadQueue()
    if (isAdmin) {
      void fetch('/api/staff/refunds/setup', { method: 'POST' }).catch(() => null)
    }
  }, [isAdmin, loadQueue])

  useEffect(() => {
    setPage(1)
  }, [
    onlyNeeds,
    range,
    customFrom,
    customTo,
    accountApplied,
    nameApplied,
    emailApplied,
    itemApplied,
    amountApplied,
    sort,
    sortDir,
  ])

  async function act(id: string, action: 'markPaid' | 'retryLoad' | 'markRefunded') {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(d.message || 'Updated.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function decide(row: QueueRow, action: 'approve' | 'deny') {
    const amountLabel = row.refundAmountDollars
      ? `$${parseFloat(row.refundAmountDollars).toFixed(2)}`
      : `$${row.amount.toFixed(2)}`
    if (
      action === 'approve' &&
      !confirm(`Approve and refund ${amountLabel} back per this request?`)
    ) {
      return
    }
    let denyReason = ''
    if (action === 'deny') {
      denyReason = window.prompt('Reason to record (optional)') ?? ''
    }
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/refunds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: row.id, action, denyReason }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(
        action === 'approve'
          ? `Refunded ${amountLabel}. Processor ref: ${d.refundProviderId || 'ok'}`
          : 'Refund denied.',
      )
      await loadQueue()
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  function openRefund(p: Payment) {
    setRefundPayment({
      id: p.id,
      programName: p.programName,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      payerEmail: p.payerEmail || p.parentEmail,
      parentEmail: p.parentEmail || p.payerEmail,
      payerName: p.payerName,
      refundStatus: p.refundStatus,
      refundedAmountDollars: p.refundedAmountDollars,
    })
    setRefundOpen(true)
  }

  function applySearch() {
    setAccountApplied(account.trim())
    setNameApplied(nameFilter.trim())
    setEmailApplied(emailFilter.trim())
    setItemApplied(itemFilter.trim())
    setAmountApplied(amount.trim())
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Payments and Refunds</h2>
          <p className="text-xs text-[#5A6070]">
            Browse by day, week, or month. Search by account #, name, email, item, or amount.
            {'\n'}
            Check Needs Reconciliation only when a Square charge failed to load the gift card.
            Filters hide historical rows from this list; they stay in CMS.
          </p>
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={onlyNeeds}
            onChange={(e) => setOnlyNeeds(e.target.checked)}
          />
          Needs Reconciliation only
        </label>
      </div>

      {!onlyNeeds ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {RANGE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  range === chip.id
                    ? 'border-[var(--brand-green)] bg-[var(--brand-soft)] text-[var(--brand-green)]'
                    : 'border-[var(--border)] bg-white text-[#5A6070] hover:bg-[#FAFCF9]'
                }`}
                onClick={() => setRange(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {range === 'custom' ? (
            <div className="flex flex-wrap gap-3 items-end rounded-xl border border-[var(--border)] bg-white p-3">
              <label className="text-xs font-semibold text-[#5A6070]">
                From
                <input
                  type="date"
                  className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-[#5A6070]">
                To
                <input
                  type="date"
                  className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
            <div className={`flex-1 ${STAFF_FILTER_CARD}`}>
              <p className={STAFF_FILTER_CARD_TITLE}>Search</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={STAFF_FILTER_LABEL}>
                  Account #
                  <input
                    className={STAFF_FILTER_INPUT}
                    placeholder="A10001"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    name="staff-payments-account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applySearch()
                    }}
                  />
                </label>
                <label className={STAFF_FILTER_LABEL}>
                  Name
                  <input
                    className={STAFF_FILTER_INPUT}
                    placeholder="Parent name"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    name="staff-payments-name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applySearch()
                    }}
                  />
                </label>
                <label className={STAFF_FILTER_LABEL}>
                  Email
                  <input
                    className={STAFF_FILTER_INPUT}
                    placeholder="parent@example.com"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    name="staff-payments-email"
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applySearch()
                    }}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] items-end">
                <label className={STAFF_FILTER_LABEL}>
                  Item
                  <input
                    className={STAFF_FILTER_INPUT}
                    placeholder="What they bought"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    name="staff-payments-item"
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applySearch()
                    }}
                  />
                </label>
                <label className={STAFF_FILTER_LABEL}>
                  Amount
                  <input
                    className={STAFF_FILTER_INPUT}
                    placeholder="25.00"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    name="staff-payments-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applySearch()
                    }}
                  />
                </label>
                <Button
                  type="button"
                  className="text-white px-5 h-10"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                  onClick={applySearch}
                >
                  Search
                </Button>
              </div>
              <p className="text-[11px] text-[#5A6070]">
                {rangeLabel ? `Showing ${rangeLabel} ET · ` : ''}
                {total} match{total === 1 ? '' : 'es'}
                {truncated ? ' · capped at 200; narrow dates or search' : ''}
              </p>
            </div>

            <div className="xl:w-48 shrink-0 rounded-xl border border-[var(--border)] bg-white p-4">
              <label className={STAFF_FILTER_LABEL}>
                Sort
                <select
                  className={STAFF_FILTER_INPUT}
                  value={`${sort}:${sortDir}`}
                  onChange={(e) => {
                    const [s, d] = e.target.value.split(':') as [
                      'date' | 'amount' | 'name' | 'item',
                      'asc' | 'desc',
                    ]
                    setSort(s)
                    setSortDir(d)
                  }}
                >
                  <option value="date:desc">Newest first</option>
                  <option value="date:asc">Oldest first</option>
                  <option value="amount:desc">Amount high to low</option>
                  <option value="amount:asc">Amount low to high</option>
                  <option value="name:asc">Name A to Z</option>
                  <option value="name:desc">Name Z to A</option>
                  <option value="item:asc">Item A to Z</option>
                  <option value="item:desc">Item Z to A</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      {isAdmin && queue.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-bold text-amber-950">
            Pending refund approval ({queue.length})
          </h3>
          <ul className="space-y-3">
            {queue.map((p) => (
              <li key={p.id} className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      {p.refundAmountDollars
                        ? `$${parseFloat(p.refundAmountDollars).toFixed(2)}`
                        : `$${p.amount.toFixed(2)}`}{' '}
                      · {p.programName || 'Payment'}
                    </p>
                    {p.adjustmentType ? (
                      <p className="text-xs font-semibold text-[#5A6070]">
                        {ADJUSTMENT_LABELS[p.adjustmentType as keyof typeof ADJUSTMENT_LABELS] ||
                          p.adjustmentType}
                        {p.refundDestination === 'cove_balance' ? ' → Cove balance' : ''}
                      </p>
                    ) : null}
                    <p className="text-xs text-[#5A6070]">
                      {p.parentEmail} · {p.paymentMethod}
                      {p.refundRequestedBy ? ` · requested by ${p.refundRequestedBy}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      className="text-white"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                      onClick={() => void decide(p, 'approve')}
                    >
                      Approve &amp; refund
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void decide(p, 'deny')}>
                      Deny
                    </Button>
                  </div>
                </div>
                <div className="text-xs whitespace-pre-wrap rounded-md bg-[#FAFCF9] border border-[var(--border)] px-3 py-2">
                  <strong>Written request:</strong>
                  {'\n'}
                  {p.refundRequestNote}
                  {p.refundStaffNote ? `\n\nStaff note: ${p.refundStaffNote}` : ''}
                  {p.exchangeNote ? `\n\nExchange: ${p.exchangeNote}` : ''}
                </div>
                {p.refundError ? (
                  <p className="text-xs text-red-700">Last error: {p.refundError}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {payments.length === 0 ? (
        <p className="text-sm text-[#5A6070]">No matching payments.</p>
      ) : null}

      <div className="space-y-3">
        {payments.map((p) => {
          const canRefund = canRequestRefund(p.refundStatus, p.amount, p.refundedAmountDollars)
          return (
            <div key={p.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">
                      ${p.amount.toFixed(2)} · {p.status}
                    </p>
                    <StaffRefundStatusBadge
                      refundStatus={p.refundStatus}
                      amount={p.amount}
                      refundedAmountDollars={p.refundedAmountDollars}
                    />
                  </div>
                  <p className="text-xs text-[#5A6070]">
                    {p.programName || 'Payment'} · {p.source}
                  </p>
                  <p className="text-xs text-[#5A6070]">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'n/a'}
                    {p.transactionId ? ` · tx ${p.transactionId}` : ''}
                  </p>
                  {(p.payerEmail || p.parentEmail || p.payerName) && (
                    <p className="text-xs text-[#5A6070]">
                      {p.payerName} {p.parentEmail || p.payerEmail}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {p.status === 'Needs Reconciliation' ? (
                    <>
                      {p.studentId ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="text-white"
                          style={{ backgroundColor: 'var(--brand-green)' }}
                          onClick={() => void act(p.id, 'retryLoad')}
                        >
                          Retry gift-card load
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void act(p.id, 'markPaid')}
                      >
                        Mark reconciled
                      </Button>
                    </>
                  ) : null}
                  {canRefund && (p.status === 'Paid' || p.status === 'Needs Reconciliation') ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || p.refundStatus === 'pending'}
                        onClick={() => openRefund(p)}
                      >
                        {p.refundStatus === 'partial' ? 'Request another refund' : 'Request refund'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !confirm(
                              'Mark this payment refunded in Staff only? Use this when you already refunded in Square or PayPal. This does not move money again.',
                            )
                          ) {
                            return
                          }
                          void act(p.id, 'markRefunded')
                        }}
                      >
                        Already refunded
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!onlyNeeds && total > pageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-[#5A6070]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

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
          await loadQueue()
        }}
      />
    </section>
  )
}
