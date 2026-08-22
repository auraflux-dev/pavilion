'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { HelpTip } from '@/components/ui/help-tip'

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
  payerName: string
}

export function StaffPaymentsPanel() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [onlyNeeds, setOnlyNeeds] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/staff/payments?needs=${onlyNeeds ? 'true' : 'false'}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setPayments(d.payments ?? [])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [onlyNeeds])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'markPaid' | 'retryLoad') {
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

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold inline-flex items-center gap-1">
            Payments
            <HelpTip tipKey="staff.payments.needs" label="About Needs Reconciliation" />
          </h2>
          <p className="text-xs text-[#5A6070]">
            Needs Reconciliation = Square charged but gift-card load failed. Do not ask the parent to
            pay again.
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

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      {payments.length === 0 ? (
        <p className="text-sm text-[#5A6070]">No matching payments.</p>
      ) : null}

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-sm font-bold">
                  ${p.amount.toFixed(2)} · {p.status}
                </p>
                <p className="text-xs text-[#5A6070]">
                  {p.programName || 'Payment'} · {p.source}
                </p>
                <p className="text-xs text-[#5A6070]">
                  {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : 'n/a'}
                  {p.transactionId ? ` · tx ${p.transactionId}` : ''}
                </p>
                {(p.payerEmail || p.payerName) && (
                  <p className="text-xs text-[#5A6070]">
                    {p.payerName} {p.payerEmail}
                  </p>
                )}
              </div>
              {p.status === 'Needs Reconciliation' ? (
                <div className="flex flex-wrap gap-2">
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
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
