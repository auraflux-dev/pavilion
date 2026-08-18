'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PickupItem = {
  id: string
  parentEmail: string
  productLabel: string
  amount: number
  paymentDate: string
  paymentMethod: string
  handedOut: boolean
}

function formatTimeEt(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Today's paid portal/site Cove snack & spirit lines from the morning window.
 */
export function StaffStorePickupsPanel() {
  const [items, setItems] = useState<PickupItem[]>([])
  const [dateEt, setDateEt] = useState('')
  const [weekday, setWeekday] = useState(true)
  const [windowLabel, setWindowLabel] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/cove/store-pickups')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setItems(d.items ?? [])
      setDateEt(String(d.dateEt ?? ''))
      setWeekday(Boolean(d.weekday))
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
            Store window · today
          </p>
          <h2 className="text-lg font-bold flex items-center gap-2 mt-0.5">
            <Package className="w-5 h-5" style={{ color: 'var(--brand-green)' }} />
            Today&apos;s store pickups
            {pendingCount > 0 ? (
              <span className="text-sm font-bold tabular-nums text-amber-800">
                · {pendingCount} waiting
              </span>
            ) : null}
          </h2>
          <p className="text-xs text-[#5A6070] mt-1 max-w-xl leading-relaxed">
            Paid portal / site snack &amp; spirit checkouts during the morning window
            {dateEt ? ` (${dateEt} ET)` : ''}. {windowLabel || 'M–Fri 8:25–8:50 AM ET'}. Mark{' '}
            <strong>Handed out</strong> when you pass the item — not for Stand / Cove card sales.
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

      {!weekday ? (
        <p className="text-sm text-[#5A6070] rounded-lg bg-[#FAFCF9] border border-[var(--border)] px-3 py-2">
          No school store window on weekends. Come back Monday–Friday morning.
        </p>
      ) : null}

      {pending.length === 0 && done.length === 0 ? (
        <p className="text-sm text-[#5A6070]">
          {weekday
            ? 'No window checkouts yet today. When parents pay for candy/spirit in the portal during 8:25–8:50, they show here.'
            : null}
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
                <p className="text-sm font-bold text-[#1A1A1A]">{item.productLabel}</p>
                <p className="text-xs text-[#5A6070]">
                  {item.parentEmail || 'no email'} · ${item.amount.toFixed(2)} ·{' '}
                  {formatTimeEt(item.paymentDate)} ET
                  {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
                </p>
              </div>
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
            </li>
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <details className="rounded-xl border border-[var(--border)] bg-[#FAFCF9]">
          <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-[#5A6070]">
            Handed out today ({done.length})
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
                      · {item.parentEmail || 'no email'} · {formatTimeEt(item.paymentDate)} ET
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
    </section>
  )
}
