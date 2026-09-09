'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type RecordRow = {
  id: string
  kind: string
  code: string
  label: string
  checkedInAt: string
  already?: boolean
}

export function StaffCheckInKiosk({ eventKey = 'default' }: { eventKey?: string }) {
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<'ticket' | 'signup' | 'volunteer' | 'walkin'>('ticket')
  const [status, setStatus] = useState('')
  const [recent, setRecent] = useState<RecordRow[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/check-in?eventKey=${encodeURIComponent(eventKey)}`)
    const data = await res.json().catch(() => ({}))
    if (res.ok) setRecent(data.recent ?? [])
  }, [eventKey])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if (!code.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), kind, eventKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Check-in failed')
      setStatus(
        data.already
          ? `Already checked in: ${data.record?.label || code}`
          : `Checked in: ${data.record?.label || code}`,
      )
      setCode('')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col gap-6 max-w-xl mx-auto py-6 px-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Check-in</h1>
          <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
            Tablet mode for the door.
            Scan or type a ticket code, signup token, or walk-in name.
          </p>
        </div>
        <Link href="/staff?view=events" className="text-xs font-semibold text-[var(--brand-green)]">
          Back to Staff
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ticket', 'signup', 'volunteer', 'walkin'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-2 text-xs font-bold border ${
              kind === k ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5A6070]'
            }`}
          >
            {k === 'walkin' ? 'Walk-in' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={kind === 'walkin' ? 'Guest name' : 'Code or QR value'}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-4 text-xl font-semibold"
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !code.trim()}>
          {busy ? 'Saving…' : 'Check in'}
        </Button>
      </form>

      {status ? (
        <p className="text-base font-semibold text-[#1A1A1A] rounded-lg border border-[var(--border)] bg-white p-3">
          {status}
        </p>
      ) : null}

      <div>
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-2">Recent</h2>
        <ul className="space-y-2">
          {recent.map((r) => (
            <li key={r.id} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">{r.label}</p>
              <p className="text-[11px] text-[#5A6070]">
                {r.kind} · {r.code} · {new Date(r.checkedInAt).toLocaleTimeString()}
              </p>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="text-sm text-[#5A6070]">No check-ins yet for this event.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
