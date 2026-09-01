'use client'

import { useCallback, useEffect, useState } from 'react'

type ActivityRow = {
  category: string
  action: string
  actorKind: string
  emailHash: string
  emailDomain: string
  method: string
  outcome: string
  route: string
  ip: string
  userAgentClass: string
  correlationId: string
  detail: string
  createdAt: string
}

const WINDOWS: { hours: number; label: string }[] = [
  { hours: 48, label: 'Last 48 hours' },
  { hours: 24, label: 'Last 24 hours' },
  { hours: 168, label: 'Last 7 days' },
]

function formatWhen(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso || 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms))
}

function identityLabel(row: ActivityRow): string {
  const domain = row.emailDomain || ''
  const hash = row.emailHash ? `…${row.emailHash.slice(-4)}` : ''
  if (domain && hash) return `${domain} ${hash}`
  if (domain) return domain
  if (hash) return hash
  return 'n/a'
}

export function StaffActivityLogPanel() {
  const [sinceHours, setSinceHours] = useState(48)
  const [items, setItems] = useState<ActivityRow[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (hours: number) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/staff/activity-log?category=auth&sinceHours=${hours}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load activity')
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity')
      setItems([])
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load(sinceHours)
  }, [load, sinceHours])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Platform activity</h2>
          <p className="mt-1 max-w-xl text-sm text-stone-600 whitespace-pre-line">
            Auth events from the last window.
            Emails are hashed. Passwords and reset tokens are never stored.
          </p>
        </div>
        <label className="text-sm text-stone-700">
          <span className="sr-only">Time window</span>
          <select
            className="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
            value={sinceHours}
            onChange={(e) => setSinceHours(Number(e.target.value))}
          >
            {WINDOWS.map((w) => (
              <option key={w.hours} value={w.hours}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {busy ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500 whitespace-pre-line">
          No auth activity in this window yet.
          Try Forgot password or a login to create the first rows.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Time (ET)</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Identity</th>
                <th className="px-3 py-2 font-medium">Route</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((row, i) => (
                <tr key={`${row.createdAt}-${row.action}-${i}`} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-stone-700">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-stone-900">{row.action}</td>
                  <td className="px-3 py-2 text-stone-600">{row.method || 'n/a'}</td>
                  <td className="px-3 py-2 text-stone-600">{row.outcome}</td>
                  <td className="px-3 py-2 text-stone-600">{identityLabel(row)}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2 text-stone-500" title={row.route}>
                    {row.route || 'n/a'}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-stone-500" title={row.detail}>
                    <span className="line-clamp-2">
                      {[row.detail, row.userAgentClass, row.correlationId ? `cid=${row.correlationId.slice(0, 8)}` : '']
                        .filter(Boolean)
                        .join(' · ') || 'n/a'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
