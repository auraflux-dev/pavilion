'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'
import { NEWSLETTER_CSS_PREVIEW_SECTIONS } from '@/lib/staff/newsletter-css-templates'
import { parseNewsletterBranding } from '@/lib/staff/newsletter-branding'
import { buildNewsletterHtml } from '@/lib/staff/newsletter-html'

type SettingKey = { key: string; label: string; multiline?: boolean }
type Group = { id: string; label: string; keys: SettingKey[] }

type Props = {
  /** When true, hide outer title (embedded in composer step). */
  embedded?: boolean
}

/**
 * Newsletter header, footer, logo, and inline preview.
 * Full CSS editing lives in Template library (CSS) below the composer.
 */
export function StaffNewsletterBrandingPanel({ embedded = false }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [logoStatus, setLogoStatus] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const branding = useMemo(
    () =>
      parseNewsletterBranding({
        get: (key, fallback) => settings[key] ?? fallback ?? '',
      }),
    [settings],
  )

  const previewHtml = useMemo(
    () =>
      buildNewsletterHtml({
        textBody: '',
        branding,
        sections: NEWSLETTER_CSS_PREVIEW_SECTIONS,
      }),
    [branding],
  )

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/site-settings')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    const g = ((d.groups ?? []) as Group[]).filter((x) => x.id === 'newsletter-branding')
    setGroups(g)
    setSettings(d.settings ?? {})
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function saveKey(key: string, value?: string) {
    setBusy(true)
    setStatus('')
    try {
      const next = value ?? normalizePlainCopy(settings[key] ?? '')
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: next }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setSettings((s) => ({ ...s, [key]: next }))
      setStatus(`Saved ${key}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function uploadLogo(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setLogoStatus('')
    setStatus('')
    try {
      const uploaded = await uploadNewsletterPngFiles(files)
      const url = uploaded.heroImageUrl
      if (!url) throw new Error('Upload did not return a URL')
      await saveKey('newsletterHeaderLogoUrl', url)
      setLogoStatus('Logo uploaded and saved. Preview below.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed'
      setLogoStatus(msg)
      setStatus(msg)
    } finally {
      setBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const group = groups[0]
  if (!group) {
    return (
      <section className={embedded ? 'space-y-3' : 'rounded-xl border border-[var(--border)] bg-white p-5'}>
        {!embedded ? <h2 className="text-lg font-bold">Email branding</h2> : null}
        <p className="text-xs text-[#5A6070]">
          VP Marketing or admin can edit newsletter header and footer here.
        </p>
      </section>
    )
  }

  const logoUrl = settings.newsletterHeaderLogoUrl?.trim()

  return (
    <section
      id={embedded ? undefined : 'newsletter-branding'}
      className={embedded ? 'space-y-4' : 'rounded-xl border border-[var(--border)] bg-white p-5 space-y-4 scroll-mt-28'}
    >
      {!embedded ? (
        <div>
          <h2 className="text-lg font-bold">Email branding</h2>
          <p className="text-xs text-[#5A6070]">
            Header logo, title, and footer for all staff HTML emails. CSS templates are in the library below.
          </p>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
        <p className="text-sm font-semibold text-[#1B2A4A]">Header logo</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => void uploadLogo(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
        </div>
        {logoStatus ? (
          <p
            className={`text-xs rounded-lg px-3 py-2 ${
              logoStatus.includes('failed') || logoStatus.includes('R2')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-[#E8F3E8] text-[#1A1A1A] border border-[var(--brand-green)]/25'
            }`}
          >
            {logoStatus}
          </p>
        ) : null}
        {logoUrl ? (
          <div className="rounded-lg border-2 border-[var(--brand-green)]/40 bg-[#FAFCF9] p-3 space-y-2">
            <p className="text-xs font-semibold text-[var(--brand-green)]">✓ Logo ready</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" className="h-12 w-auto rounded border border-[var(--border)]" />
          </div>
        ) : null}
      </div>

      {group.keys
        .filter((k) => !['newsletterHeaderLogoUrl', 'newsletterCustomCss', 'newsletterCssTemplatesJson'].includes(k.key))
        .map((field) => (
          <div key={field.key} className="space-y-2">
            <StaffPlainCopyField
              label={field.label}
              value={settings[field.key] ?? ''}
              rows={field.multiline ? 4 : 2}
              onChange={(val) => setSettings((s) => ({ ...s, [field.key]: val }))}
              onCommit={(val) => setSettings((s) => ({ ...s, [field.key]: normalizePlainCopy(val) }))}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void saveKey(field.key)}
            >
              Save
            </Button>
          </div>
        ))}

      <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setPreviewOpen(true)}>
          Preview with filler text
        </Button>
        <p className="text-[11px] text-[#5A6070]">
          Opens inline. Links in filler copy show as clickable links.
        </p>
      </div>

      {previewOpen ? (
        <div className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-sm font-semibold text-[#1B2A4A]">Preview (filler text)</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
          <iframe
            title="Newsletter preview"
            srcDoc={previewHtml}
            className="min-h-[480px] w-full border-0 bg-[#F4F7F5]"
          />
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
