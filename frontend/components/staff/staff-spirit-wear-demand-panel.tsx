'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SpiritDemandRollup, SpiritWearDemand } from '@/lib/staff/spirit-wear-demand'

/**
 * In-person size demand log: when shirts/hoodies are out of a parent's size,
 * staff capture interest so retail can reorder with real counts.
 * Available to events / membership / retail (not only Cove register staff).
 */
export function StaffSpiritWearDemandPanel({
  context = 'retail',
}: {
  /** Copy tweak when shown outside The Cove tab */
  context?: 'retail' | 'events' | 'membership'
}) {
  const [items, setItems] = useState<SpiritWearDemand[]>([])
  const [rollup, setRollup] = useState<SpiritDemandRollup[]>([])
  const [openCount, setOpenCount] = useState(0)
  const [canManage, setCanManage] = useState(false)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [productName, setProductName] = useState('Hoodie')
  const [sizeLabel, setSizeLabel] = useState('')
  const [qty, setQty] = useState('1')
  const [eventNote, setEventNote] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/staff/cove/demand?status=${filter}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setItems(d.items ?? [])
      setRollup(d.rollup ?? [])
      setOpenCount(Number(d.openCount) || 0)
      setCanManage(Boolean(d.canManage))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function logManual(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName,
          parentEmail,
          parentPhone,
          productName,
          sizeLabel,
          qty: Number(qty) || 1,
          eventNote,
          notes,
          source: 'manual',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save')
      setStatus(`Logged ${productName} · ${sizeLabel}`)
      setParentName('')
      setParentEmail('')
      setParentPhone('')
      setSizeLabel('')
      setQty('1')
      setNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function setItemStatus(id: string, next: 'ordered' | 'fulfilled' | 'cancelled' | 'open') {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/demand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(`Marked ${next}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="cove-demand"
      className="scroll-mt-28 rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden"
    >
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0EDE8] px-5 py-4"
        style={{ backgroundColor: '#FAFCF9' }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <ClipboardList
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--brand-green)' }}
            aria-hidden
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A6070]">
              In-person events
            </p>
          <h2 className="mt-0.5 text-lg font-bold text-[#1A1A1A]">
            Size demand (shirts / hoodies)
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5A6070]">
            {context === 'retail'
              ? 'When a parent wants spirit wear but their size is out, log it here (or from the register size picker). Use the rollup below to place a restock order.'
              : 'No Cove register needed. If a parent wants a shirt or hoodie and the size is out (or you are not on the register), log name + size here so retail can reorder.'}
          </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--brand-green)]">{openCount} open</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void load()}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {rollup.length ? (
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">Open demand by size</h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7F4] text-left text-xs uppercase tracking-wide text-[#5A6070]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Product</th>
                    <th className="px-3 py-2 font-bold">Size</th>
                    <th className="px-3 py-2 font-bold">Wanted</th>
                    <th className="px-3 py-2 font-bold">Families</th>
                    <th className="px-3 py-2 font-bold">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {rollup.map((row) => (
                    <tr key={row.key} className="border-t border-[#F0EDE8]">
                      <td className="px-3 py-2 font-semibold text-[#1A1A1A]">{row.productName}</td>
                      <td className="px-3 py-2 font-bold text-[var(--brand-green)]">{row.sizeLabel}</td>
                      <td className="px-3 py-2 tabular-nums">{row.openQty}</td>
                      <td className="px-3 py-2 tabular-nums">{row.openCount}</td>
                      <td className="px-3 py-2 text-xs text-[#5A6070] font-mono">
                        {row.sku || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5A6070]">No open size demand yet.</p>
        )}

        <form
          onSubmit={(e) => void logManual(e)}
          className="rounded-xl border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-3"
        >
          <h3 className="text-sm font-bold text-[#1A1A1A]">Quick log (no register lookup)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Parent name *
              <input
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Email
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Phone
              <input
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Event / table
              <input
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="e.g. Open House AM"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Product *
              <select
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              >
                <option>Hoodie</option>
                <option>Spirit T-Shirt</option>
                <option>Long Sleeve Shirt</option>
                <option>Drawstring Bag</option>
                <option>Other spirit wear</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Size wanted *
              <input
                required
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. Adult L / Youth M"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1">
              Qty
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070] space-y-1 sm:col-span-2">
              Notes
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Log demand
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('open')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              filter === 'open' ? 'bg-[var(--brand-green)] text-white' : 'bg-[#F5F7F4] text-[#5A6070]'
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              filter === 'all' ? 'bg-[var(--brand-green)] text-white' : 'bg-[#F5F7F4] text-[#5A6070]'
            }`}
          >
            All
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--border)] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A]">
                  {item.productName} · {item.sizeLabel}
                  <span className="ml-2 text-xs font-semibold text-[#5A6070]">×{item.qty}</span>
                </p>
                <p className="text-xs text-[#5A6070] mt-0.5">
                  {item.parentName}
                  {item.parentEmail ? ` · ${item.parentEmail}` : ''}
                  {item.parentPhone ? ` · ${item.parentPhone}` : ''}
                  {item.eventNote ? ` · ${item.eventNote}` : ''}
                </p>
                <p className="text-[11px] text-[#9AA3B0] mt-0.5 capitalize">
                  {item.status}
                  {item.sku ? ` · ${item.sku}` : ''}
                </p>
              </div>
              {item.status === 'open' && canManage ? (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setItemStatus(item.id, 'ordered')}
                  >
                    Ordered
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    className="text-white"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                    onClick={() => void setItemStatus(item.id, 'fulfilled')}
                  >
                    Fulfilled
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setItemStatus(item.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {status ? <p className="text-sm font-semibold text-green-700">{status}</p> : null}
      </div>
    </section>
  )
}
