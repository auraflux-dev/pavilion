'use client'

/**
 * Staff site brand controls (demo/trial page builder only).
 */
import { useCallback, useEffect, useState } from 'react'
import { BRAND_FONT_OPTIONS } from '@/lib/cms/section-types'

type Brand = {
  logoUrl: string
  faviconUrl: string
  colorPrimary: string
  colorDark: string
  colorAccent: string
  colorWarm: string
  colorSoft: string
  fontSans: string
  fontDisplay: string
  ptoName: string
  schoolName: string
  cheer: string
}

const EMPTY: Brand = {
  logoUrl: '',
  faviconUrl: '',
  colorPrimary: '',
  colorDark: '',
  colorAccent: '',
  colorWarm: '',
  colorSoft: '',
  fontSans: '',
  fontDisplay: '',
  ptoName: '',
  schoolName: '',
  cheer: '',
}

const inputClass =
  'w-full rounded border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[#1a1a1a]'

async function uploadCmsImage(file: File): Promise<string> {
  const body = new FormData()
  body.set('file', file)
  const r = await fetch('/api/staff/cms-media/upload', { method: 'POST', body })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload failed')
  return String(d.url)
}

export function StaffSiteBrandPanel() {
  const [brand, setBrand] = useState<Brand>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/staff/site-brand')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load')
      setBrand({ ...EMPTY, ...(d.brand ?? {}) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const r = await fetch('/api/staff/site-brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      setBrand({ ...EMPTY, ...(d.brand ?? {}) })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof Brand>(key: K, value: Brand[K]) {
    setBrand((b) => ({ ...b, [key]: value }))
  }

  if (loading) return <p className="text-sm text-[#5A6070]">Loading brand…</p>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--brand-dark)]">Brand</h2>
        <p className="whitespace-pre-line text-sm text-[#5A6070]">
          Logo, colors, and fonts for the visitor site.
          Cascades site-wide on demo and trial.
        </p>
      </div>

      {error ? <p className="text-sm text-[#A00]">{error}</p> : null}
      {saved ? <p className="text-sm text-[var(--brand-green)]">Saved. Refresh the public site to see colors.</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-[#5A6070]">Logo</span>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded border border-[var(--border)] bg-[#FAFAF8]">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : null}
            </div>
            <label className="cursor-pointer text-xs font-bold underline" style={{ color: 'var(--brand-green)' }}>
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    set('logoUrl', await uploadCmsImage(f))
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Upload failed')
                  }
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          <input
            className={inputClass}
            placeholder="Logo URL"
            value={brand.logoUrl}
            onChange={(e) => set('logoUrl', e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">PTO name</span>
          <input className={inputClass} value={brand.ptoName} onChange={(e) => set('ptoName', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">School name</span>
          <input className={inputClass} value={brand.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-[#5A6070]">Cheer</span>
          <input className={inputClass} value={brand.cheer} onChange={(e) => set('cheer', e.target.value)} />
        </label>

        {(
          [
            ['colorPrimary', 'Primary'],
            ['colorDark', 'Dark'],
            ['colorAccent', 'Accent'],
            ['colorWarm', 'Warm'],
            ['colorSoft', 'Soft'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-semibold text-[#5A6070]">{label}</span>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded border border-[var(--border)]"
                value={brand[key] || '#1B4D3E'}
                onChange={(e) => set(key, e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="#hex"
                value={brand[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          </label>
        ))}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Sans font</span>
          <select
            className={inputClass}
            value={brand.fontSans}
            onChange={(e) => set('fontSans', e.target.value)}
          >
            {BRAND_FONT_OPTIONS.map((f) => (
              <option key={f.id || 'default'} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Display font</span>
          <select
            className={inputClass}
            value={brand.fontDisplay}
            onChange={(e) => set('fontDisplay', e.target.value)}
          >
            {BRAND_FONT_OPTIONS.map((f) => (
              <option key={f.id || 'default-d'} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-md bg-[var(--brand-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save brand'}
      </button>
    </div>
  )
}
