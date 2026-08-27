'use client'

/**
 * Staff → Volunteers: /volunteer form signups (Wix Volunteers CMS).
 */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Submission = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  opportunity: string
  notes: string
  status: string
  submittedAt: string
}

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'declined', label: 'Declined' },
  { value: 'done', label: 'Done' },
] as const

function formatWhen(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function StaffVolunteerSubmissionsPanel() {
  const [rows, setRows] = useState<Submission[]>([])
  const [filter, setFilter] = useState('new')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [newCount, setNewCount] = useState(0)

  const load = useCallback(async (statusFilter = filter) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/staff/volunteers/submissions?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load submissions')
      setRows(data.submissions ?? [])
      setNewCount(Number(data.counts?.new ?? 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function setRowStatus(id: string, next: string) {
    setBusyId(id)
    setStatus('')
    setError('')
    try {
      const res = await fetch('/api/staff/volunteers/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setStatus('Updated.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Volunteer signups</h2>
          <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
            From the public /volunteer form.
            {newCount > 0 ? `\n${newCount} new waiting.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-[#5A6070] flex items-center gap-1.5">
            Status
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[#1A1A1A]"
            >
              <option value="all">All</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--brand)]">{status}</p> : null}

      {loading ? (
        <p className="text-sm text-[#5A6070]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#5A6070]">
          {filter === 'new' ? 'No new volunteer signups.' : 'No submissions in this filter.'}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {rows.map((row) => {
            const name = `${row.firstName} ${row.lastName}`.trim() || 'Volunteer'
            return (
              <li key={row.id} className="p-3 space-y-2 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{name}</p>
                    <p className="text-xs text-[#5A6070]">
                      <a className="underline underline-offset-2" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                      {row.phone ? ` · ${row.phone}` : ''}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#8A90A0]">{formatWhen(row.submittedAt)}</p>
                </div>
                <p className="text-sm text-[#1A1A1A]">
                  <span className="text-[#5A6070]">Opportunity: </span>
                  {row.opportunity || '—'}
                </p>
                {row.notes ? (
                  <p className="text-xs text-[#5A6070] whitespace-pre-line">{row.notes}</p>
                ) : null}
                <label className="text-[11px] text-[#5A6070] flex items-center gap-2">
                  Status
                  <select
                    value={row.status}
                    disabled={busyId === row.id}
                    onChange={(e) => void setRowStatus(row.id, e.target.value)}
                    className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[#1A1A1A]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
