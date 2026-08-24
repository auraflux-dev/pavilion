'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SiteStringSurface } from '@/lib/defaults/site-string-registry'

type ThemeRow = {
  id: string
  page: string
  surface: SiteStringSurface
  route: string
  fields: string
  stringKeys?: string[]
  customCss: string
  stringOverrides: string
  fromDefault?: boolean
  scopeClass: string
}

const SURFACE_LABEL: Record<SiteStringSurface | 'all', string> = {
  all: 'All surfaces',
  visitor: 'Visitor website',
  member: 'Member portal',
  staff: 'Staff portal',
  legal: 'Legal',
}

export function StaffPageThemePanel() {
  const [pages, setPages] = useState<ThemeRow[]>([])
  const [surface, setSurface] = useState<SiteStringSurface | 'all'>('all')
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState<ThemeRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/page-theme')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      const list = (d.pages ?? []) as ThemeRow[]
      setPages(list)
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

  const filtered = useMemo(
    () => (surface === 'all' ? pages : pages.filter((p) => p.surface === surface)),
    [pages, surface],
  )

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
      const r = await fetch('/api/staff/page-theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          page: form.page,
          customCss: form.customCss,
          stringOverrides: form.stringOverrides,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(`Saved ${form.page}. www updates within seconds after refresh.`)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function ensureCmsFields() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/cms/ensure-fields', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not ensure CMS fields')
      setStatus('CMS fields ready (PageContent CSS + program landing fields).')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not ensure CMS fields')
    } finally {
      setBusy(false)
    }
  }

  function insertStringKey(key: string) {
    if (!form) return
    const line = `${key}|`
    const current = form.stringOverrides.trim()
    setForm({
      ...form,
      stringOverrides: current ? `${current}\n${line}` : line,
    })
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Page CSS &amp; strings</h2>
          <p className="text-xs text-[#5A6070] mt-1 leading-relaxed whitespace-pre-line">
            Admin and VP Marketing.
            Fields show what families see today. Empty CMS values use code defaults until you Save.
            Per-page CSS injects on the live route after Save.
            Scope selectors with the page class shown below (example: .page-member-portal main).
            String overrides use key|text, one per line.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void ensureCmsFields()}>
          Ensure CMS fields
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'visitor', 'member', 'staff'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSurface(key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              surface === key
                ? 'text-white border-transparent'
                : 'border-[var(--border)] text-[#5A6070]'
            }`}
            style={surface === key ? { backgroundColor: 'var(--brand-green)' } : undefined}
          >
            {SURFACE_LABEL[key]}
          </button>
        ))}
      </div>

      <select
        value={selected}
        onChange={(e) => pick(e.target.value)}
        className="w-full sm:max-w-lg border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
      >
        {filtered.map((p) => (
          <option key={p.page} value={p.page}>
            {p.page} · {p.route}
            {p.fromDefault ? ' (defaults)' : ''}
          </option>
        ))}
      </select>

      {form ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-[#FAFAF8] border border-[var(--border)] px-3 py-2 text-xs text-[#5A6070] space-y-1">
            <p>
              <span className="font-semibold text-[#1A1A1A]">Route:</span> {form.route}
            </p>
            <p>
              <span className="font-semibold text-[#1A1A1A]">Standard copy fields:</span> {form.fields}
            </p>
            <p>
              <span className="font-semibold text-[#1A1A1A]">CSS scope class:</span>{' '}
              <code className="text-[11px]">.{form.scopeClass}</code>
            </p>
            {form.stringKeys?.length ? (
              <div className="space-y-1">
                <p className="font-semibold text-[#1A1A1A]">String keys (click to insert)</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.stringKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => insertStringKey(key)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-white hover:border-[var(--brand-green)]"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6070] mb-1">Custom CSS</label>
            <textarea
              value={form.customCss}
              onChange={(e) => setForm({ ...form, customCss: e.target.value })}
              rows={10}
              placeholder={`.${form.scopeClass} main {\n  /* your rules */\n}`}
              className="w-full font-mono text-xs border border-[var(--border)] rounded-lg px-3 py-2"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6070] mb-1">
              String overrides (key|text)
            </label>
            <textarea
              value={form.stringOverrides}
              onChange={(e) => setForm({ ...form, stringOverrides: e.target.value })}
              rows={8}
              placeholder={'studentsTitle|My Students\nrefresh|Refresh'}
              className="w-full font-mono text-xs border border-[var(--border)] rounded-lg px-3 py-2 whitespace-pre"
              spellCheck={false}
            />
            <p className="text-[11px] text-[#5A6070] mt-1">
              Pre-filled with live copy (CMS + code defaults). portal-hub labels can also be edited
              under Page copy bullets. Overrides here apply on the live site.
            </p>
          </div>

          <Button
            disabled={busy}
            onClick={() => void save()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {busy ? 'Saving…' : 'Save page CSS & strings'}
          </Button>
        </div>
      ) : null}

      {status ? (
        <p
          role="status"
          className={`text-xs font-medium ${status.includes('Saved') ? 'text-[var(--brand-green)]' : 'text-[#5A6070]'}`}
        >
          {status}
        </p>
      ) : null}
    </section>
  )
}
