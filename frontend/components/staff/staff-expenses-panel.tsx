'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type LineItem = { date: string; vendor: string; description: string; amount: string }

type Expense = {
  id: string
  requestorName: string
  requestorEmail: string
  requestorPhone: string
  committeeEvent: string
  dateOfRequest: string
  lineItems: { date: string; vendor: string; description: string; amount: number }[]
  totalAmount: number
  paymentMethod: string
  paymentHandle: string
  receiptUrls: string[]
  status: 'Submitted' | 'Approved' | 'Paid' | 'Rejected'
  submittedByEmail: string
  chairApproverEmail: string
  chairApprovedDate: string
  treasurerPaidDate: string
  notes: string
  createdDate: string
}

const STATUS_STYLE: Record<Expense['status'], string> = {
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-blue-50 text-blue-700 border-blue-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const emptyLine = (): LineItem => ({ date: '', vendor: '', description: '', amount: '' })

/**
 * Staff → Expenses. Any staff submit a PTO reimbursement request; President/Admin
 * approve or reject; Treasurer/Admin mark paid. Backed by ExpenseReimbursements CMS.
 */
export function StaffExpensesPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [canManage, setCanManage] = useState(false)
  const [canApprove, setCanApprove] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const [requestorName, setRequestorName] = useState('')
  const [requestorEmail, setRequestorEmail] = useState('')
  const [requestorPhone, setRequestorPhone] = useState('')
  const [committeeEvent, setCommitteeEvent] = useState('')
  const [dateOfRequest, setDateOfRequest] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [paymentMethod, setPaymentMethod] = useState('Zelle')
  const [paymentHandle, setPaymentHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [receipts, setReceipts] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const total = lines.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/expenses')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setExpenses(d.expenses ?? [])
      setCanManage(Boolean(d.canManage))
      setCanApprove(Boolean(d.canApprove))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [])

  useEffect(() => {
    void load()
    fetch('/api/staff/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) setRequestorName((v) => v || d.name)
        if (d?.email) setRequestorEmail((v) => v || d.email)
      })
      .catch(() => {})
  }, [load])

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)))
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setStatus('')
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const r = await fetch('/api/staff/expenses/receipt', { method: 'POST', body: fd })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Upload failed')
        setReceipts((prev) => [...prev, { url: d.url, name: d.name || file.name }])
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorName,
          requestorEmail,
          requestorPhone,
          committeeEvent,
          dateOfRequest,
          lineItems: lines.map((li) => ({
            date: li.date,
            vendor: li.vendor,
            description: li.description,
            amount: Number(li.amount) || 0,
          })),
          paymentMethod,
          paymentHandle,
          receiptUrls: receipts.map((rc) => rc.url),
          notes,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Submit failed')
      setStatus('Reimbursement submitted for approval.')
      setCommitteeEvent('')
      setLines([emptyLine()])
      setPaymentHandle('')
      setNotes('')
      setReceipts([])
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  async function act(id: string, action: 'approve' | 'reject' | 'markPaid' | 'reopen') {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6E6E]/30'

  return (
    <div className="space-y-5">
      {/* Submit form */}
      <section
        id="expense-submit"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">PTO Expense Reimbursement</h1>
          <p className="text-xs text-[#5A6070] mt-1">
            Submit receipts for PTO-approved spending. President / Admin approves, then the
            Treasurer sends your Zelle or PayPal transfer and marks it paid.
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">1. Requestor details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Name"
              value={requestorName}
              onChange={(e) => setRequestorName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Email"
              value={requestorEmail}
              onChange={(e) => setRequestorEmail(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Phone (optional)"
              value={requestorPhone}
              onChange={(e) => setRequestorPhone(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Committee / event name"
              value={committeeEvent}
              onChange={(e) => setCommitteeEvent(e.target.value)}
            />
            <label className="text-xs text-[#5A6070] sm:col-span-2">
              Date of request
              <input
                type="date"
                className={inputCls}
                value={dateOfRequest}
                onChange={(e) => setDateOfRequest(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">2. Expense breakdown</h2>
          <p className="text-[11px] text-[#5A6070]">
            Attach original receipts below. Do not include personal items on the same receipt.
          </p>
          <div className="space-y-2">
            {lines.map((li, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_7rem_2rem] items-center">
                <input
                  type="date"
                  className={inputCls}
                  value={li.date}
                  onChange={(e) => updateLine(i, { date: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Vendor / store"
                  value={li.vendor}
                  onChange={(e) => updateLine(i, { vendor: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Description of item(s)"
                  value={li.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={li.amount}
                  onChange={(e) => updateLine(i, { amount: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-[#5A6070] hover:text-rose-600 text-lg leading-none"
                  aria-label="Remove line"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addLine}
              className="text-sm font-medium text-[#0B6E6E] hover:underline"
            >
              + Add line
            </button>
            <div className="text-sm font-semibold text-[#1A1A1A]">
              Total due: {money(total)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Receipts</h2>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => onUpload(e.target.files)}
            className="block text-sm"
          />
          {uploading ? <p className="text-xs text-[#5A6070]">Uploading…</p> : null}
          {receipts.length > 0 ? (
            <ul className="text-xs text-[#0B6E6E] space-y-1">
              {receipts.map((rc, i) => (
                <li key={i} className="flex items-center gap-2">
                  <a href={rc.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {rc.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => setReceipts((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[#5A6070] hover:text-rose-600"
                    aria-label="Remove receipt"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">3. Reimbursement / payment</h2>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <select
              className={inputCls}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Zelle">Zelle</option>
              <option value="PayPal">PayPal</option>
            </select>
            <input
              className={inputCls}
              placeholder={`${paymentMethod} username / handle`}
              value={paymentHandle}
              onChange={(e) => setPaymentHandle(e.target.value)}
            />
          </div>
          <textarea
            className={`${inputCls} mt-2`}
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={busy || uploading}>
            {busy ? 'Submitting…' : 'Submit reimbursement'}
          </Button>
          {status ? <span className="text-sm text-[#5A6070]">{status}</span> : null}
        </div>
      </section>

      {/* List */}
      <section
        id="expense-requests"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-3"
      >
        <h2 className="text-sm font-semibold text-[#1A1A1A]">
          {canManage ? 'All reimbursement requests' : 'My reimbursement requests'}
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-[#5A6070]">No reimbursement requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((ex) => (
              <li key={ex.id} className="rounded-lg border border-[var(--border)] p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {ex.requestorName} · {money(ex.totalAmount)}
                    </p>
                    <p className="text-xs text-[#5A6070]">
                      {ex.committeeEvent || 'PTO'} · {ex.dateOfRequest} · {ex.paymentMethod}{' '}
                      {ex.paymentHandle}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide rounded-full border px-2.5 py-0.5 ${STATUS_STYLE[ex.status]}`}
                  >
                    {ex.status}
                  </span>
                </div>

                {ex.lineItems.length > 0 ? (
                  <ul className="text-xs text-[#5A6070] space-y-0.5">
                    {ex.lineItems.map((li, i) => (
                      <li key={i}>
                        {[li.date, li.vendor, li.description].filter(Boolean).join(' · ')} ·
                        {money(li.amount)}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {ex.receiptUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {ex.receiptUrls.map((u, i) => (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0B6E6E] hover:underline"
                      >
                        Receipt {i + 1}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-rose-500">No receipt attached</p>
                )}

                {ex.notes ? <p className="text-xs text-[#5A6070]">Note: {ex.notes}</p> : null}

                {(canApprove || canManage) && ex.status !== 'Paid' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canApprove && ex.status === 'Submitted' ? (
                      <>
                        <Button variant="outline" onClick={() => act(ex.id, 'approve')} disabled={busy}>
                          Approve
                        </Button>
                        <Button variant="outline" onClick={() => act(ex.id, 'reject')} disabled={busy}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {canManage && ex.status === 'Approved' ? (
                      <Button onClick={() => act(ex.id, 'markPaid')} disabled={busy}>
                        Mark paid
                      </Button>
                    ) : null}
                    {canApprove && ex.status === 'Rejected' ? (
                      <Button variant="outline" onClick={() => act(ex.id, 'reopen')} disabled={busy}>
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {ex.status === 'Paid' && ex.treasurerPaidDate ? (
                  <p className="text-[11px] text-emerald-700">
                    Paid {new Date(ex.treasurerPaidDate).toLocaleDateString()}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
