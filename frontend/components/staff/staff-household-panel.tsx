'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
} from '@/lib/staff/staff-filter-ui'

type HouseholdPayload = {
  account: {
    accountNumber: string
    emails: string[]
    primaryEmail: string
    tiers: string[]
    students: Array<{ id: string; firstName: string; lastName: string; grade: string }>
  }
  enrollments: Array<{
    id: string
    programName: string
    studentName: string
    status: string
    feePaid: number
    transactionId: string
    parentEmail: string
    enrolledAt: string
    active: boolean
  }>
  payments: Array<{
    id: string
    programName: string
    amount: number
    status: string
    paymentDate: string
    paymentMethod: string
    transactionId: string
    source: string
    parentEmail: string
  }>
  summary: {
    activeSeats: number
    paymentRows: number
    paymentSum: number
  }
}

type Props = {
  /** Prefill account or email when opened from another panel */
  initialQuery?: string
  className?: string
}

export function StaffHouseholdPanel({ initialQuery = '', className = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [data, setData] = useState<HouseholdPayload | null>(null)

  const load = useCallback(async (raw?: string) => {
    const q = String(raw ?? query).trim()
    if (!q) {
      setStatus('Enter an account number (A10050) or parent email.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      if (/^a?\d{4,6}$/i.test(q.replace(/\s+/g, ''))) {
        params.set('account', q)
      } else if (q.includes('@')) {
        params.set('email', q)
      } else {
        params.set('account', q)
      }
      const r = await fetch(`/api/staff/household?${params.toString()}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Load failed')
      setData(d as HouseholdPayload)
      setStatus('')
    } catch (err) {
      setData(null)
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [query])

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={STAFF_FILTER_CARD}>
        <p className={STAFF_FILTER_CARD_TITLE}>Household by account number</p>
        <p className="text-xs text-[#5A6070] whitespace-pre-line mb-3">
          {`Open the family with A##### first.\nEnrollments and processor payments nest under that account.\nEmail is only an entry key.`}
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className={`${STAFF_FILTER_LABEL} flex-1 min-w-[12rem]`}>
            Account or email
            <input
              className={STAFF_FILTER_INPUT}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load()
              }}
              placeholder="A10050 or parent@email.com"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void load()} className="text-sm">
            {busy ? 'Loading…' : 'Open household'}
          </Button>
        </div>
        {status ? <p className="text-xs text-amber-800 mt-2">{status}</p> : null}
      </div>

      {data ? (
        <div className="space-y-4 border border-[var(--border)] rounded-lg p-3">
          <div>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {data.account.accountNumber}
            </p>
            <p className="text-xs text-[#5A6070] whitespace-pre-line mt-1">
              {[
                data.account.primaryEmail,
                data.account.tiers.length ? `Tier: ${data.account.tiers.join(', ')}` : '',
                `${data.summary.activeSeats} active seat${data.summary.activeSeats === 1 ? '' : 's'}`,
                `${data.summary.paymentRows} payment row${data.summary.paymentRows === 1 ? '' : 's'} · $${data.summary.paymentSum.toFixed(2)}`,
              ]
                .filter(Boolean)
                .join('\n')}
            </p>
            {data.account.emails.length > 1 ? (
              <p className="text-xs text-[#5A6070] mt-1">
                Household emails: {data.account.emails.join(', ')}
              </p>
            ) : null}
            {data.account.students.length ? (
              <p className="text-xs text-[#5A6070] mt-1">
                Students:{' '}
                {data.account.students
                  .map((s) => `${s.firstName} ${s.lastName}`.trim() + (s.grade ? ` (gr ${s.grade})` : ''))
                  .join(' · ')}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Enrollments</h3>
            {data.enrollments.length === 0 ? (
              <p className="text-xs text-[#5A6070]">No enrollment rows on this account.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {data.enrollments.map((e) => (
                  <div
                    key={e.id}
                    className="border border-[var(--border)] rounded-md px-2 py-1.5 text-sm"
                  >
                    <p className="font-medium">
                      {e.programName || 'Program'}
                      {!e.active ? ' · inactive' : ''}
                    </p>
                    <p className="text-xs text-[#5A6070] whitespace-pre-line">
                      {[
                        `${e.studentName || 'Student'} · ${e.status}${e.feePaid ? ` · $${e.feePaid}` : ''}`,
                        e.transactionId ? `Tx ${e.transactionId.slice(0, 16)}…` : 'No transaction id',
                        e.parentEmail,
                      ].join('\n')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Payments</h3>
            {data.payments.length === 0 ? (
              <p className="text-xs text-[#5A6070]">No payment rows on this account.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto">
                {data.payments.map((p) => (
                  <div
                    key={p.id}
                    className="border border-[var(--border)] rounded-md px-2 py-1.5 text-sm"
                  >
                    <p className="font-medium">
                      {p.programName || 'Payment'} · ${Number(p.amount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-[#5A6070] whitespace-pre-line">
                      {[
                        `${p.paymentMethod || 'Method'} · ${p.status || 'Status'}`,
                        p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '',
                        p.transactionId ? `Tx ${p.transactionId.slice(0, 16)}…` : '',
                        p.source ? `Source ${p.source}` : '',
                      ]
                        .filter(Boolean)
                        .join('\n')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
