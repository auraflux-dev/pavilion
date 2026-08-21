'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

type Field = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select'
  options?: string[]
  required?: boolean
  hint?: string
}

type Row = Record<string, unknown> & { id: string }

const emptyRow = (fields: Field[]): Row => {
  const row: Row = { id: '' }
  for (const f of fields) {
    if (f.type === 'boolean') row[f.key] = f.key === 'active' || f.key === 'showInNav' || f.key === 'showInFooter'
    else if (f.type === 'number') row[f.key] = 0
    else if (f.type === 'select') row[f.key] = f.options?.[0] ?? ''
    else row[f.key] = ''
  }
  return row
}

export function StaffCmsCollectionPanel({
  collection,
  title,
  sectionId,
}: {
  collection: string
  title?: string
  /** Anchor for Jump to links on multi-section staff views. */
  sectionId?: string
}) {
  const [fields, setFields] = useState<Field[]>([])
  const [items, setItems] = useState<Row[]>([])
  const [form, setForm] = useState<Row | null>(null)
  const [label, setLabel] = useState(title ?? collection)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/staff/cms/${encodeURIComponent(collection)}`)
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setFields(d.fields ?? [])
    setItems((d.items ?? []) as Row[])
    setLabel(title || d.label || collection)
  }, [collection, title])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  function startNew() {
    setForm(emptyRow(fields))
    setStatus('')
  }

  function edit(row: Row) {
    setForm({ ...row })
    setStatus('')
  }

  async function save() {
    if (!form) return
    setBusy(true)
    setStatus('')
    try {
      const isNew = !form.id
      const payload: Row = { ...form }
      for (const f of fields) {
        if (f.type === 'textarea') {
          payload[f.key] = normalizePlainCopy(String(payload[f.key] ?? ''))
        }
      }
      const r = await fetch(`/api/staff/cms/${encodeURIComponent(collection)}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(isNew ? 'Created.' : 'Saved.')
      setForm(null)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function deactivate() {
    if (!form?.id) return
    const activeField = fields.find((f) => f.key === 'active')
    if (!activeField) {
      setStatus('This collection has no Active flag. edit in Wix to remove.')
      return
    }
    setForm({ ...form, active: false })
    setBusy(true)
    try {
      const r = await fetch(`/api/staff/cms/${encodeURIComponent(collection)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, active: false }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Deactivate failed')
      setStatus('Deactivated (hidden on site).')
      setForm(null)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Deactivate failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id={sectionId}
      className={`rounded-xl border border-[var(--border)] bg-white p-5 space-y-4${sectionId ? ' scroll-mt-28' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{label}</h2>
          <p className="text-xs text-[#5A6070]">
            Add, edit, and deactivate visitor-facing site content without opening Wix.
          </p>
        </div>
        <Button type="button" className="text-white" style={{ backgroundColor: 'var(--brand-green)' }} onClick={startNew}>
          Add new
        </Button>
      </div>

      <div className="border border-[var(--border)] rounded-lg divide-y max-h-56 overflow-auto">
        {items.length === 0 ? (
          <p className="p-3 text-sm text-[#5A6070]">No rows yet.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => edit(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#F7F5F0]"
            >
              <span className="font-medium">
                {String(item.name ?? item.label ?? item.title ?? item.question ?? item.tierId ?? item.id)}
              </span>
              {item.active === false ? (
                <span className="ml-2 text-[10px] uppercase text-[#5A6070]">inactive</span>
              ) : null}
            </button>
          ))
        )}
      </div>

      {form ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-bold text-[#5A6070]">{form.id ? 'Edit row' : 'New row'}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={f.type === 'textarea' || f.key === 'answer' || f.key === 'perks' ? 'sm:col-span-2' : ''}
              >
                <label className="text-[11px] text-[#5A6070]">{f.label}</label>
                {f.hint ? <p className="text-[10px] text-[#8A8F9C] mb-1">{f.hint}</p> : null}
                {f.type === 'boolean' ? (
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.key])}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    />
                    Yes
                  </label>
                ) : f.type === 'select' ? (
                  <select
                    value={String(form[f.key] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <StaffPlainCopyField
                    value={String(form[f.key] ?? '')}
                    rows={4}
                    onChange={(next) => setForm({ ...form, [f.key]: next })}
                    onCommit={(next) =>
                      setForm((prev) => (prev ? { ...prev, [f.key]: normalizePlainCopy(next) } : prev))
                    }
                  />
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={String(form[f.key] ?? '')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
            {form.id && fields.some((f) => f.key === 'active') ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => void deactivate()}>
                Deactivate
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
