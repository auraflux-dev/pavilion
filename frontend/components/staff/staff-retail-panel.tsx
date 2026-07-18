'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function StaffRetailPanel() {
  const [storeIds, setStoreIds] = useState('')
  const [spiritIds, setSpiritIds] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/site-settings')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setStoreIds(String(d.storeProductIds ?? '').replaceAll(',', '\n'))
      setSpiritIds(String(d.spiritWearProductIds ?? '').replaceAll(',', '\n'))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(key: 'storeProductIds' | 'spiritWearProductIds', value: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(`Saved ${key}. Live within ~5 minutes.`)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">The Cove</h2>
        <p className="text-xs text-[#5A6070]">Visitor page: /cove (store snacks + spirit merchandise).</p>
        <p className="text-xs text-[#5A6070]">
          Paste Wix Catalog product UUIDs (one per line). Create products in Wix Stores first, then
          list IDs here to show them on The Cove (/cove). Remove an ID to hide it.
        </p>
      </div>
      <label className="block text-xs font-bold text-[#5A6070]">
        School store product IDs
        <textarea
          value={storeIds}
          onChange={(e) => setStoreIds(e.target.value)}
          rows={6}
          className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono font-normal"
        />
      </label>
      <Button
        disabled={busy}
        onClick={() => void save('storeProductIds', storeIds)}
        className="text-white"
        style={{ backgroundColor: '#085508' }}
      >
        Save store list
      </Button>
      <label className="block text-xs font-bold text-[#5A6070]">
        Spirit wear product IDs
        <textarea
          value={spiritIds}
          onChange={(e) => setSpiritIds(e.target.value)}
          rows={6}
          className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono font-normal"
        />
      </label>
      <Button
        disabled={busy}
        onClick={() => void save('spiritWearProductIds', spiritIds)}
        className="text-white"
        style={{ backgroundColor: '#085508' }}
      >
        Save spirit wear list
      </Button>
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
