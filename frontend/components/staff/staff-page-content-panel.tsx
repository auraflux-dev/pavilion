'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'

type PageRow = {
  id: string
  page: string
  eyebrow: string
  title: string
  body: string
  sectionTitle: string
  sectionBody: string
  bullets: string
  ctaLabel: string
  ctaHref: string
  flyerImage: string
  active: boolean
  fromDefault?: boolean
}

export function StaffPageContentPanel() {
  const [pages, setPages] = useState<PageRow[]>([])
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState<PageRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [scope, setScope] = useState<'all' | 'cove'>('all')
  const [canBrandFix, setCanBrandFix] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/page-content')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      const list = (d.pages ?? []) as PageRow[]
      setPages(list)
      setScope(d.scope === 'cove' ? 'cove' : 'all')
      setCanBrandFix(d.canBrandFix !== false)
      if (!selected && list[0]) {
        setSelected(list[0].page)
        setForm(list[0])
      } else if (selected) {
        const row = list.find((p) => p.page === selected)
        if (row) setForm(row)
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [selected])

  useEffect(() => {
    void load()
  }, [load])

  function pick(page: string) {
    setSelected(page)
    const row = pages.find((p) => p.page === page)
    if (row) setForm({ ...row })
  }

  async function save() {
    if (!form) return
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/page-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(`Saved ${form.page}.`)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function brandFix(apply: boolean) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/page-content/brand-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Brand fix failed')
      setStatus(String(d.message ?? 'Done'))
      if (apply) await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Brand fix failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Page copy</h2>
          <p className="text-xs text-[#5A6070]">
            {scope === 'cove'
              ? 'Edit The Cove public page copy (store / how / CTA / spirit wear). Changes show after refresh / ~5 minutes.'
              : 'Edit heroes and section copy without Wix CMS. Changes show after refresh / ~5 minutes.'}
          </p>
        </div>
        {canBrandFix ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void brandFix(false)}>
              Preview SHMS → SHMS PTO
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void brandFix(true)}>
              Apply SHMS → SHMS PTO
            </Button>
          </div>
        ) : null}
      </div>
      <select
        value={selected}
        onChange={(e) => pick(e.target.value)}
        className="w-full sm:max-w-md border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
      >
        {pages.map((p) => (
          <option key={p.page} value={p.page}>
            {p.page}
            {p.fromDefault ? ' (defaults)' : ''}
          </option>
        ))}
      </select>

      {form ? (
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={form.eyebrow}
            onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
            placeholder="Eyebrow"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.ctaLabel}
            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            placeholder="CTA label"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="sm:col-span-2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={3}
            placeholder="Body"
            className="sm:col-span-2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.sectionTitle}
            onChange={(e) => setForm({ ...form, sectionTitle: e.target.value })}
            placeholder="Section title"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.ctaHref}
            onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
            placeholder="CTA href"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.sectionBody}
            onChange={(e) => setForm({ ...form, sectionBody: e.target.value })}
            rows={2}
            placeholder="Section body"
            className="sm:col-span-2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.bullets}
            onChange={(e) => setForm({ ...form, bullets: e.target.value })}
            rows={4}
            placeholder="Bullets (one per line)"
            className="sm:col-span-2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2">
            <StaffFlyerUpload
              label="Page flyer / hero image"
              currentUrl={form.flyerImage}
              disabled={busy}
              onUploaded={(url) => setForm({ ...form, flyerImage: url })}
            />
            <p className="text-[11px] text-[#5A6070] mt-1">
              Upload then click Save page copy so the flyer sticks on this page.
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active (off = use code defaults)
          </label>
          <Button
            disabled={busy}
            onClick={() => void save()}
            className="text-white sm:col-span-2"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {busy ? 'Saving…' : 'Save page copy'}
          </Button>
        </div>
      ) : null}
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
