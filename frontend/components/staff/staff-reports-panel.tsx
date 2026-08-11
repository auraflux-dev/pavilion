'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

type Focus = 'programs' | 'cove' | 'payments' | 'membership' | 'events'

type ReportRow = Record<string, string | number>

const FOCUS_OPTIONS: { id: Focus; label: string; rolesHint: string }[] = [
  { id: 'programs', label: 'Programs', rolesHint: 'Enrollments' },
  { id: 'cove', label: 'Cove', rolesHint: 'Store card + Cove sales' },
  { id: 'payments', label: 'Payments', rolesHint: 'All transactions' },
  { id: 'membership', label: 'Membership', rolesHint: 'Membership payments' },
  { id: 'events', label: 'Events', rolesHint: 'Ticket orders' },
]

export function StaffReportsPanel({
  allowedFocuses,
}: {
  allowedFocuses: Focus[]
}) {
  const focuses = FOCUS_OPTIONS.filter((f) => allowedFocuses.includes(f.id))
  const [focus, setFocus] = useState<Focus>(focuses[0]?.id ?? 'programs')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<{
    ok: boolean
    senderEmail: string | null
    hint: string
    connectUrl?: string
  } | null>(null)

  const load = useCallback(async () => {
    if (!focus) return
    setBusy(true)
    setStatus('')
    try {
      const qs = new URLSearchParams({ focus })
      if (from) qs.set('from', from)
      if (to) qs.set('to', to)
      const r = await fetch(`/api/staff/reports?${qs}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setColumns(d.columns ?? [])
      setRows(d.rows ?? [])
      setSortKey((d.columns ?? [])[0] ?? '')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
      setRows([])
      setColumns([])
    } finally {
      setBusy(false)
    }
  }, [focus, from, to])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void fetch('/api/staff/gmail-send/status')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.ok === 'boolean') {
          setGmailStatus({
            ok: d.ok,
            senderEmail: d.senderEmail ?? null,
            hint: d.hint || d.preferredSenderHint || '',
            connectUrl: d.connectUrl,
          })
        }
      })
      .catch(() => null)
  }, [])

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function exportCsv() {
    if (!columns.length) return
    const header = columns.join(',')
    const lines = sorted.map((row) =>
      columns
        .map((c) => `"${String(row[c] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${focus}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!focuses.length) {
    return (
      <section className="rounded-xl border border-[#E8E4DC] bg-white p-5">
        <p className="text-sm text-[#5A6070]">No report areas for your role.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Reports</h2>
        <p className="text-xs text-[#5A6070]">
          View, sort, and export your area. Programs, Cove, Payments, Membership, or Events.
        </p>
        {gmailStatus ? (
          <p className={`text-xs mt-2 ${gmailStatus.ok ? 'text-green-800' : 'text-amber-800'}`}>
            Purchase emails:{' '}
            {gmailStatus.ok
              ? `ready (as ${gmailStatus.senderEmail})`
              : 'not connected yet'}
            {!gmailStatus.ok && gmailStatus.connectUrl ? (
              <>
                {' '}
                ·
                <a href={gmailStatus.connectUrl} className="underline font-semibold">
                  Connect Google
                </a>{' '}
                while signed in as president@, treasurer@, or vp-membershipexperience@
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {focuses.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFocus(f.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              focus === f.id
                ? 'bg-[#085508] text-white border-[#085508]'
                : 'bg-white border-[#E8E4DC] text-[#5A6070]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-[#5A6070] space-y-1">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-[#5A6070] space-y-1">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          variant="outline"
          className="text-sm"
        >
          Refresh
        </Button>
        <Button
          type="button"
          disabled={!sorted.length}
          onClick={exportCsv}
          className="text-white text-sm"
          style={{ backgroundColor: '#085508' }}
        >
          Export CSV
        </Button>
      </div>

      <div className="border border-[#E8E4DC] rounded-lg overflow-auto max-h-[28rem]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-[#FAFAF8]">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-3 py-2 font-semibold text-[#5A6070]">
                  <button type="button" className="underline-offset-2 hover:underline" onClick={() => toggleSort(c)}>
                    {c}
                    {sortKey === c ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={String(row.id)} className="border-t border-[#F0EDE8]">
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 text-[#1A1A1A] whitespace-nowrap">
                    {String(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {!sorted.length ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="px-3 py-6 text-[#5A6070]">
                  {busy ? 'Loading…' : 'No rows for this range.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#5A6070]">
        {sorted.length} row{sorted.length === 1 ? '' : 's'}
        {status ? ` · ${status}` : ''}
      </p>
    </section>
  )
}
