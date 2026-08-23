'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import {
  BUILTIN_NEWSLETTER_CSS_TEMPLATES,
  loadLocalCssTemplates,
  mergeCssTemplateLists,
  parseSiteCssTemplatesJson,
  saveLocalCssTemplates,
  serializeSiteCssTemplates,
  type NewsletterCssTemplate,
} from '@/lib/staff/newsletter-css-templates'
import { NEWSLETTER_DEFAULT_CSS } from '@/lib/staff/newsletter-default-css'

type Props = {
  canEditSiteTemplates?: boolean
  activeCss: string
  onApplyCss: (css: string, templateKey?: string) => void
}

function templateKey(t: NewsletterCssTemplate) {
  return `${t.source}:${t.id}`
}

/** Browse, edit, save CSS templates under the newsletter composer. */
export function StaffNewsletterCssLibrary({
  canEditSiteTemplates = false,
  activeCss,
  onApplyCss,
}: Props) {
  const [siteJson, setSiteJson] = useState('')
  const [localTemplates, setLocalTemplates] = useState<NewsletterCssTemplate[]>([])
  const [selectedKey, setSelectedKey] = useState('builtin:builtin-shms-default')
  const [editName, setEditName] = useState('')
  const [editCss, setEditCss] = useState(activeCss)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const siteTemplates = useMemo(() => parseSiteCssTemplatesJson(siteJson), [siteJson])
  const allTemplates = useMemo(
    () => mergeCssTemplateLists(siteTemplates, localTemplates),
    [siteTemplates, localTemplates],
  )

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/site-settings')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setSiteJson(String(d.settings?.newsletterCssTemplatesJson ?? ''))
    setLocalTemplates(loadLocalCssTemplates())
    const active = String(d.settings?.newsletterCustomCss ?? '').trim()
    if (active) setEditCss(active)
  }, [])

  useEffect(() => {
    void load().catch(() => undefined)
  }, [load])

  useEffect(() => {
    setEditCss(activeCss)
  }, [activeCss])

  function selectTemplate(key: string) {
    setSelectedKey(key)
    const tpl = allTemplates.find((t) => templateKey(t) === key)
    if (tpl) {
      setEditCss(tpl.css)
      setEditName(tpl.source === 'builtin' ? '' : tpl.name)
    }
  }

  async function applyLive() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'newsletterCustomCss', value: normalizePlainCopy(editCss) }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      onApplyCss(editCss, selectedKey)
      setStatus('CSS applied to live emails.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function saveLocal() {
    const name = editName.trim() || 'My CSS template'
    const id = `local-${Date.now().toString(36)}`
    const next = [
      ...localTemplates.filter((t) => t.name !== name),
      { id, name, css: editCss, updatedAt: new Date().toISOString(), source: 'local' as const },
    ]
    setLocalTemplates(next)
    saveLocalCssTemplates(next)
    setSelectedKey(templateKey({ id, name, css: editCss, updatedAt: '', source: 'local' }))
    setStatus(`Saved "${name}" on this browser.`)
  }

  async function saveSite() {
    if (!canEditSiteTemplates) return
    const name = editName.trim()
    if (!name) {
      setStatus('Enter a template name.')
      return
    }
    setBusy(true)
    try {
      const id = `site-${Date.now().toString(36)}`
      const nextSite = [
        ...siteTemplates.filter((t) => t.name !== name),
        { id, name, css: editCss, updatedAt: new Date().toISOString(), source: 'site' as const },
      ]
      const json = serializeSiteCssTemplates(nextSite)
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'newsletterCssTemplatesJson', value: json }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setSiteJson(json)
      setSelectedKey(templateKey({ id, name, css: editCss, updatedAt: '', source: 'site' }))
      setStatus(`Saved "${name}" for the team.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="newsletter-css-library"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold">Template library (CSS)</h2>
        <p className="text-xs text-[#5A6070]">
          Save, load, and edit newsletter CSS. Built-in SHMS default is preloaded for new newsletters.
        </p>
      </div>

      <label className="text-xs text-[#5A6070] block">
        Load template
        <select
          value={selectedKey}
          onChange={(e) => selectTemplate(e.target.value)}
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

      <StaffPlainCopyField
        label="CSS editor (full newsletter)"
        value={editCss}
        rows={16}
        onChange={setEditCss}
        onCommit={(v) => setEditCss(normalizePlainCopy(v))}
      />

      <label className="text-xs text-[#5A6070] block">
        Template name (to save)
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="e.g. Fall 2026 default"
          className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void applyLive()}>
          Apply to live emails
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={saveLocal}>
          Save on this browser
        </Button>
        {canEditSiteTemplates ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void saveSite()}>
            Save for team
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setEditCss(NEWSLETTER_DEFAULT_CSS)
            setStatus('Reset editor to SHMS default CSS.')
          }}
        >
          Reset to default
        </Button>
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}

export { BUILTIN_NEWSLETTER_CSS_TEMPLATES }
