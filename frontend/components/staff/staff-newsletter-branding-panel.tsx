'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'

type SettingKey = { key: string; label: string; multiline?: boolean }
type Group = { id: string; label: string; keys: SettingKey[] }

/**
 * Newsletter header, footer, logo, and optional CSS.
 * Lives under Newsletter workspace (not Site settings / Cove).
 */
export function StaffNewsletterBrandingPanel() {
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [cssOpen, setCssOpen] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

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

  async function saveKey(key: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: normalizePlainCopy(settings[key] ?? ''),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
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
    setStatus('')
    try {
      const uploaded = await uploadNewsletterPngFiles(files)
      const url = uploaded.heroImageUrl
      if (!url) throw new Error('Upload did not return a URL')
      setSettings((s) => ({ ...s, newsletterHeaderLogoUrl: url }))
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'newsletterHeaderLogoUrl', value: url }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus('Logo uploaded and saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const group = groups[0]
  if (!group) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-lg font-bold">Email branding</h2>
        <p className="text-xs text-[#5A6070] mt-1">
          VP Marketing or admin can edit newsletter header and footer here.
        </p>
      </section>
    )
  }

  const logoUrl = settings.newsletterHeaderLogoUrl?.trim()

  return (
    <section
      id="newsletter-branding"
      className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4 scroll-mt-28"
    >
      <div>
        <h2 className="text-lg font-bold">Email branding</h2>
        <p className="text-xs text-[#5A6070]">
          Header logo, title, footer, and optional CSS for all staff HTML emails.
        </p>
      </div>

      <div className="space-y-3 border border-[var(--border)] rounded-lg p-3">
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
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-auto rounded border border-[var(--border)]" />
          ) : null}
        </div>
      </div>

      {group.keys
        .filter((k) => k.key !== 'newsletterHeaderLogoUrl')
        .map((field) => {
          if (field.key === 'newsletterCustomCss') {
            return (
              <div key={field.key} className="space-y-2 border border-[var(--border)] rounded-lg p-3">
                <button
                  type="button"
                  className="text-sm font-semibold text-[#1B2A4A] underline-offset-2 hover:underline"
                  onClick={() => setCssOpen((v) => !v)}
                >
                  {cssOpen ? '▼' : '▶'} CSS editor (advanced)
                </button>
                {cssOpen ? (
                  <>
                    <StaffPlainCopyField
                      label={field.label}
                      value={settings[field.key] ?? ''}
                      rows={8}
                      onChange={(val) =>
                        setSettings((s) => ({
                          ...s,
                          [field.key]: val,
                        }))
                      }
                      onCommit={(val) =>
                        setSettings((s) => ({
                          ...s,
                          [field.key]: normalizePlainCopy(val),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void saveKey(field.key)}
                    >
                      Save CSS
                    </Button>
                  </>
                ) : (
                  <p className="text-[11px] text-[#5A6070]">
                    Click to expand and edit custom newsletter CSS.
                  </p>
                )}
              </div>
            )
          }
          return (
            <div key={field.key} className="space-y-2">
              <StaffPlainCopyField
                label={field.label}
                value={settings[field.key] ?? ''}
                rows={field.multiline ? 4 : 2}
                onChange={(val) =>
                  setSettings((s) => ({
                    ...s,
                    [field.key]: val,
                  }))
                }
                onCommit={(val) =>
                  setSettings((s) => ({
                    ...s,
                    [field.key]: normalizePlainCopy(val),
                  }))
                }
              />
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void saveKey(field.key)}>
                Save
              </Button>
            </div>
          )
        })}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
