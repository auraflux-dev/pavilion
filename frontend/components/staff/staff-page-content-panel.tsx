'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { vanillaizeIfDemo, publicBrandFace } from '@/lib/demo/brand'

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
      const payload = {
        ...form,
        body: normalizePlainCopy(form.body),
        sectionBody: normalizePlainCopy(form.sectionBody),
        bullets: normalizePlainCopy(form.bullets),
      }
      const r = await fetch('/api/staff/page-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
              ? vanillaizeIfDemo('Edit The Cove public page copy (Cove / how / CTA / spirit wear). Changes show after refresh / ~5 minutes.')
              : 'Edit heroes and section copy without Wix CMS. Changes show after refresh / ~5 minutes.'}
          </p>
        </div>
        {canBrandFix ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void brandFix(false)}>
              {vanillaizeIfDemo(`Preview fix to ${publicBrandFace().short}`)}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void brandFix(true)}>
              {vanillaizeIfDemo(`Apply fix to ${publicBrandFace().short}`)}
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
          <div className="sm:col-span-2">
            <StaffPlainCopyField
              label={
                form.page === 'programs'
                  ? 'Hero body (short pitch only). Class names belong on the program cards, not here.'
                  : 'Body'
              }
              value={form.body}
              rows={3}
              onChange={(next) => setForm({ ...form, body: next })}
              onCommit={(next) => setForm((f) => (f ? { ...f, body: normalizePlainCopy(next) } : f))}
            />
          </div>
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
          <div className="sm:col-span-2">
            <StaffPlainCopyField
              label="Section body"
              value={form.sectionBody}
              rows={2}
              onChange={(next) => setForm({ ...form, sectionBody: next })}
              onCommit={(next) =>
                setForm((f) => (f ? { ...f, sectionBody: normalizePlainCopy(next) } : f))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <StaffPlainCopyField
              label={
                form.page === 'programs'
                  ? 'Bullets (unused on /programs catalog. leave blank.)'
                  : 'Bullets (one per line)'
              }
              value={form.bullets}
              rows={6}
              hint="One bullet per line. Press Enter between items. No HTML."
              placeholder="One idea per line"
              onChange={(next) => setForm({ ...form, bullets: next })}
              onCommit={(next) => setForm((f) => (f ? { ...f, bullets: normalizePlainCopy(next) } : f))}
            />
          </div>
          <div className="sm:col-span-2">
            <StaffFlyerUpload
              label="Page flyer / hero image"
              currentUrl={form.flyerImage}
              disabled={busy}
              onUploaded={(media) => setForm({ ...form, flyerImage: media.url })}
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
