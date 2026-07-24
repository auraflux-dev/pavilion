'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Item = {
  membershipId: string
  parentEmail: string
  tier: string
  shirtSize: string
  kind: 'spirit_shirt' | 'magnet'
  label: string
  detail: string
  notes: string
}

export function StaffFulfillmentsPanel() {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/membership/fulfillments')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setItems(d.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function fulfill(item: Item) {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/fulfillments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: item.membershipId,
          kind: item.kind,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(`Marked ${item.label} fulfilled for ${item.parentEmail}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const shirts = items.filter((i) => i.kind === 'spirit_shirt')
  const magnets = items.filter((i) => i.kind === 'magnet')

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: '#085508' }} />
          Membership fulfillment queue
        </h2>
        <p className="text-xs text-[#5A6070] mt-1">
          Physical perks still owed after paid membership checkout. Mark fulfilled when the shirt or
          magnet is handed out / mailed.
        </p>
      </div>

      {busy && items.length === 0 ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#085508]" />
      ) : items.length === 0 ? (
        <p className="text-sm text-[#5A6070]">Queue clear — nothing pending.</p>
      ) : (
        <div className="space-y-5">
          {shirts.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
                Spirit Wear T-shirts ({shirts.length})
              </p>
              <ul className="space-y-2">
                {shirts.map((item) => (
                  <li
                    key={`${item.membershipId}:${item.kind}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8E4DC] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{item.parentEmail}</p>
                      <p className="text-xs text-[#5A6070]">
                        {item.tier} · Size {item.detail || item.shirtSize || '—'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      className="text-white"
                      style={{ backgroundColor: '#085508' }}
                      onClick={() => void fulfill(item)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Fulfilled
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {magnets.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
                Magnets ({magnets.length})
              </p>
              <ul className="space-y-2">
                {magnets.map((item) => (
                  <li
                    key={`${item.membershipId}:${item.kind}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8E4DC] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{item.parentEmail}</p>
                      <p className="text-xs text-[#5A6070]">{item.tier} · 1 magnet</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      className="text-white"
                      style={{ backgroundColor: '#085508' }}
                      onClick={() => void fulfill(item)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Fulfilled
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs text-green-700 font-semibold">{status}</p> : null}
    </section>
  )
}
