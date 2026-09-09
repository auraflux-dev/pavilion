'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProductModuleDef, ProductModuleId } from '@/lib/modules/catalog'

type Preset = { id: string; label: string; notes?: string }

export function StaffModulesPanel() {
  const [product, setProduct] = useState<'pavilion' | 'businessrocket'>('pavilion')
  const [catalog, setCatalog] = useState<ProductModuleDef[]>([])
  const [groups, setGroups] = useState<Record<string, string>>({})
  const [presets, setPresets] = useState<Preset[]>([])
  const [enabled, setEnabled] = useState<Set<ProductModuleId>>(new Set())
  const [orgId, setOrgId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setStatus('')
    const res = await fetch(`/api/staff/modules?product=${product}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(data.error || 'Could not load modules')
      return
    }
    setCatalog(data.catalog ?? [])
    setGroups(data.groups ?? {})
    setPresets(data.presets ?? [])
    setEnabled(new Set(data.enabled ?? []))
    setOrgId(data.orgId ?? null)
  }, [product])

  useEffect(() => {
    void load()
  }, [load])

  const byGroup = useMemo(() => {
    const map = new Map<string, ProductModuleDef[]>()
    for (const m of catalog) {
      const list = map.get(m.group) || []
      list.push(m)
      map.set(m.group, list)
    }
    return map
  }, [catalog])

  function toggle(id: ProductModuleId) {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: Array.from(enabled) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setEnabled(new Set(data.enabled ?? []))
      setStatus(`Saved ${data.enabled?.length ?? 0} modules for this org.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function applyPreset(presetId: string) {
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Preset failed')
      setEnabled(new Set(data.enabled ?? []))
      setStatus('Preset applied.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Preset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Modules</h2>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          Check what this customer build includes.
          Same catalog shape for Pavilion and Business Rocket.
        </p>
        {orgId ? (
          <p className="text-[11px] text-[#5A6070] mt-1">Org: {orgId}</p>
        ) : (
          <p className="text-[11px] text-amber-800 mt-1">No org resolved. Showing defaults only.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-xs font-semibold border ${
            product === 'pavilion' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#5A6070]'
          }`}
          onClick={() => setProduct('pavilion')}
        >
          Pavilion
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-xs font-semibold border ${
            product === 'businessrocket' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#5A6070]'
          }`}
          onClick={() => setProduct('businessrocket')}
        >
          Business Rocket
        </button>
        <Button type="button" size="sm" disabled={busy || !orgId} onClick={() => void save()}>
          Save for org
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy || !orgId}
            className="rounded-md border border-[var(--border)] bg-[#FAF8F4] px-2.5 py-1.5 text-[11px] font-semibold"
            onClick={() => void applyPreset(p.id)}
            title={p.notes || p.label}
          >
            Preset: {p.label}
          </button>
        ))}
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      <div className="space-y-5">
        {Array.from(byGroup.entries()).map(([group, items]) => (
          <section key={group}>
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">
              {groups[group] || group}
            </h3>
            <ul className="space-y-1.5">
              {items.map((m) => (
                <li key={m.id}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={enabled.has(m.id)}
                      onChange={() => toggle(m.id)}
                    />
                    <span>
                      <span className="font-semibold text-[#1A1A1A]">{m.label}</span>
                      <span className="block text-[11px] text-[#5A6070]">{m.summary}</span>
                      <span className="block text-[10px] font-mono text-[#8A857C]">{m.id}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
