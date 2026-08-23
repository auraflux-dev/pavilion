'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'
import {
  NEWSLETTER_CSS_PREVIEW_SECTIONS,
  loadLocalCssTemplates,
  mergeCssTemplateLists,
  parseSiteCssTemplatesJson,
  saveLocalCssTemplates,
  serializeSiteCssTemplates,
  type NewsletterCssTemplate,
} from '@/lib/staff/newsletter-css-templates'
import { parseNewsletterBranding } from '@/lib/staff/newsletter-branding'
import { buildNewsletterHtml } from '@/lib/staff/newsletter-html'

type SettingKey = { key: string; label: string; multiline?: boolean }
type Group = { id: string; label: string; keys: SettingKey[] }

type Props = {
  /** When true, hide outer title (embedded in composer step). */
  embedded?: boolean
  canEditSiteTemplates?: boolean
}

/**
 * Newsletter header, footer, logo, CSS templates, and preview.
 */
export function StaffNewsletterBrandingPanel({ embedded = false, canEditSiteTemplates = false }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [cssOpen, setCssOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('builtin:builtin-none')
  const [localTemplates, setLocalTemplates] = useState<NewsletterCssTemplate[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)

  const siteTemplates = useMemo(
    () => parseSiteCssTemplatesJson(settings.newsletterCssTemplatesJson ?? ''),
    [settings.newsletterCssTemplatesJson],
  )

  const allTemplates = useMemo(
    () => mergeCssTemplateLists(siteTemplates, localTemplates),
    [siteTemplates, localTemplates],
  )

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
    setLocalTemplates(loadLocalCssTemplates())
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
    setStatus('')
    try {
      const uploaded = await uploadNewsletterPngFiles(files)
      const url = uploaded.heroImageUrl
      if (!url) throw new Error('Upload did not return a URL')
      await saveKey('newsletterHeaderLogoUrl', url)
      setStatus('Logo uploaded and saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  function templateKey(t: NewsletterCssTemplate) {
    return `${t.source}:${t.id}`
  }

  function applyTemplate(key: string) {
    const tpl = allTemplates.find((t) => templateKey(t) === key)
    if (!tpl) return
    setSelectedTemplateId(key)
    setSettings((s) => ({ ...s, newsletterCustomCss: tpl.css }))
    setCssOpen(Boolean(tpl.css.trim()))
    setStatus(tpl.css.trim() ? `Loaded template: ${tpl.name}` : 'Cleared custom CSS.')
  }

  function saveTemplateLocal() {
    const name = templateName.trim()
    const css = settings.newsletterCustomCss ?? ''
    if (!name) {
      setStatus('Enter a template name first.')
      return
    }
    const id = `local-${Date.now().toString(36)}`
    const next: NewsletterCssTemplate[] = [
      ...localTemplates.filter((t) => t.name !== name),
      { id, name, css, updatedAt: new Date().toISOString(), source: 'local' },
    ]
    setLocalTemplates(next)
    saveLocalCssTemplates(next)
    setSelectedTemplateId(templateKey({ id, name, css, updatedAt: new Date().toISOString(), source: 'local' }))
    setTemplateName('')
    setStatus(`Saved "${name}" on this browser.`)
  }

  async function saveTemplateSite() {
    if (!canEditSiteTemplates) return
    const name = templateName.trim()
    const css = settings.newsletterCustomCss ?? ''
    if (!name) {
      setStatus('Enter a template name first.')
      return
    }
    const id = `site-${Date.now().toString(36)}`
    const nextSite = [
      ...siteTemplates.filter((t) => t.name !== name),
      { id, name, css, updatedAt: new Date().toISOString(), source: 'site' as const },
    ]
    const json = serializeSiteCssTemplates(nextSite)
    await saveKey('newsletterCssTemplatesJson', json)
    setSelectedTemplateId(templateKey({ id, name, css, updatedAt: new Date().toISOString(), source: 'site' }))
    setTemplateName('')
    setStatus(`Saved "${name}" for the whole team.`)
  }

  function openPreviewWindow() {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
    if (!w) {
      setPreviewOpen(true)
      return
    }
    w.document.write(previewHtml)
    w.document.close()
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
            Header logo, title, footer, and CSS for all staff HTML emails.
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
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-auto rounded border border-[var(--border)]" />
          ) : null}
        </div>
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

      <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm font-semibold text-[#1B2A4A] underline-offset-2 hover:underline"
            onClick={() => setCssOpen((v) => !v)}
          >
            {cssOpen ? '▼' : '▶'} CSS editor
          </button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={openPreviewWindow}>
              Preview with filler text
            </Button>
          </div>
        </div>

        <label className="text-xs text-[#5A6070] block">
          Load CSS template
          <select
            value={selectedTemplateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            {allTemplates.map((t) => (
              <option key={templateKey(t)} value={templateKey(t)}>
                {t.name}
                {t.source === 'local' ? ' (this browser)' : ''}
                {t.source === 'site' ? ' (team)' : ''}
              </option>
            ))}
          </select>
        </label>

        {cssOpen ? (
          <>
            <StaffPlainCopyField
              label="Custom CSS"
              value={settings.newsletterCustomCss ?? ''}
              rows={8}
              onChange={(val) => setSettings((s) => ({ ...s, newsletterCustomCss: val }))}
              onCommit={(val) =>
                setSettings((s) => ({ ...s, newsletterCustomCss: normalizePlainCopy(val) }))
              }
            />
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-[#5A6070] flex-1 min-w-[10rem]">
                Save as template
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Fall 2026 green theme"
                  className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={saveTemplateLocal}>
                Save on this browser
              </Button>
              {canEditSiteTemplates ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => void saveTemplateSite()}>
                  Save for team
                </Button>
              ) : null}
            </div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void saveKey('newsletterCustomCss')}>
              Apply CSS to live emails
            </Button>
            <p className="text-[11px] text-[#5A6070]">
              Use classes like <code className="text-[10px]">.nl-section-title</code>,{' '}
              <code className="text-[10px]">.nl-body</code>, and{' '}
              <code className="text-[10px]">.nl-section</code>. Preview opens sample filler copy.
            </p>
          </>
        ) : (
          <p className="text-[11px] text-[#5A6070]">
            Click CSS editor to expand. Load a saved template or preview before you send.
          </p>
        )}
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-semibold text-[#1B2A4A]">CSS preview (filler text)</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
            <iframe
              title="Newsletter CSS preview"
              srcDoc={previewHtml}
              className="min-h-[480px] w-full flex-1 border-0 bg-[#F4F7F5]"
            />
          </div>
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
