'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseCanvaDesignUrl } from '@/lib/canva/parse-design-url'
import type { CanvaDesign } from '@/lib/canva/client'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'

export type NewsletterCanvaMeta = {
  canvaDesignId?: string
  canvaTitle?: string
  canvaEditUrl?: string
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  heroImageUrl?: string
  heroImageKey?: string
  pageImageUrls?: string[]
}

export type NewsletterTemplateRow = {
  id: string
  name: string
  subject: string
  body: string
  utmCampaign: string
  canvaDesignId: string
  canvaTitle: string
  canvaEditUrl: string
  canvaViewUrl: string
  canvaThumbnailUrl: string
  heroImageUrl: string
  heroImageKey: string
  pageImageUrlsJson: string
  beatsJson: string
  updatedAt: string
}

type Props = {
  subject: string
  body: string
  utmCampaign: string
  beatsJson?: string
  canvaMeta: NewsletterCanvaMeta
  onCanvaMetaChange: (meta: NewsletterCanvaMeta) => void
  onLoad: (tpl: {
    subject: string
    body: string
    utmCampaign: string
    canvaViewUrl: string
    canvaThumbnailUrl: string
    canvaTitle: string
    canvaDesignId: string
    canvaEditUrl: string
    heroImageUrl: string
    heroImageKey: string
    pageImageUrls: string[]
    beatsJson: string
    templateId: string
  }) => void
}

export function StaffNewsletterTemplatesPanel({
  subject,
  body,
  utmCampaign,
  beatsJson = '',
  canvaMeta,
  onCanvaMetaChange,
  onLoad,
}: Props) {
  const [templates, setTemplates] = useState<NewsletterTemplateRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [canvaUrl, setCanvaUrl] = useState('')
  const [canvaDesigns, setCanvaDesigns] = useState<CanvaDesign[]>([])
  const [canvaConnected, setCanvaConnected] = useState(false)
  const pngUploadRef = useRef<HTMLInputElement>(null)

  const loadTemplates = useCallback(async () => {
    const r = await fetch('/api/staff/cms/NewsletterTemplates')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load templates')
    const rows = (d.items ?? []) as Record<string, unknown>[]
    setTemplates(
      rows
        .filter((row) => row.active !== false)
        .map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.name ?? 'Untitled'),
          subject: String(row.subject ?? ''),
          body: String(row.body ?? ''),
          utmCampaign: String(row.utmCampaign ?? ''),
          canvaDesignId: String(row.canvaDesignId ?? ''),
          canvaTitle: String(row.canvaTitle ?? ''),
          canvaEditUrl: String(row.canvaEditUrl ?? ''),
          canvaViewUrl: String(row.canvaViewUrl ?? ''),
          canvaThumbnailUrl: String(row.canvaThumbnailUrl ?? ''),
          heroImageUrl: String(row.heroImageUrl ?? ''),
          heroImageKey: String(row.heroImageKey ?? ''),
          pageImageUrlsJson: String(row.pageImageUrlsJson ?? ''),
          beatsJson: String(row.beatsJson ?? ''),
          updatedAt: String(row.updatedAt ?? ''),
        }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    )
  }, [])

  useEffect(() => {
    void loadTemplates().catch(() => setTemplates([]))
    void fetch('/api/staff/canva/status')
      .then((r) => r.json())
      .then((d) => setCanvaConnected(Boolean(d.connected)))
      .catch(() => setCanvaConnected(false))
  }, [loadTemplates])

  useEffect(() => {
    if (!canvaConnected) return
    void fetch('/api/staff/canva/designs?limit=12')
      .then((r) => r.json())
      .then((d) => setCanvaDesigns(d.designs ?? []))
      .catch(() => setCanvaDesigns([]))
  }, [canvaConnected])

  function applyCanvaMeta(meta: NewsletterCanvaMeta) {
    onCanvaMetaChange({
      canvaDesignId: meta.canvaDesignId ?? '',
      canvaTitle: meta.canvaTitle ?? '',
      canvaEditUrl: meta.canvaEditUrl ?? '',
      canvaViewUrl: meta.canvaViewUrl ?? '',
      canvaThumbnailUrl: meta.canvaThumbnailUrl ?? '',
      heroImageUrl: meta.heroImageUrl ?? canvaMeta.heroImageUrl ?? '',
      heroImageKey: meta.heroImageKey ?? canvaMeta.heroImageKey ?? '',
      pageImageUrls: meta.pageImageUrls ?? canvaMeta.pageImageUrls ?? [],
    })
  }

  function importCanvaUrl() {
    const parsed = parseCanvaDesignUrl(canvaUrl)
    if (!parsed) {
      setStatus('Paste a Canva design link (canva.com/design/…/view or /edit).')
      return
    }
    applyCanvaMeta({
      canvaDesignId: parsed.designId,
      canvaEditUrl: parsed.editUrl,
      canvaViewUrl: parsed.viewUrl,
      heroImageUrl: '',
      heroImageKey: '',
    })
    setStatus('Canva link attached. Exporting PNG for email…')
    if (canvaConnected) {
      void exportPng({
        canvaDesignId: parsed.designId,
        canvaEditUrl: parsed.editUrl,
        canvaViewUrl: parsed.viewUrl,
      })
    } else {
      setStatus(
        'Canva link attached. Connect Canva to auto-export PNG, or click Export PNG for email.',
      )
    }
  }

  async function uploadPngFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      setStatus('Choose PNG file(s) from Canva Download.')
      return
    }
    setBusy(true)
    setStatus('Uploading PNG for email…')
    try {
      const d = await uploadNewsletterPngFiles(fileList)
      onCanvaMetaChange({
        ...canvaMeta,
        heroImageUrl: d.heroImageUrl,
        heroImageKey: d.heroImageKey,
        pageImageUrls: d.pageImageUrls,
      })
      const n = d.pageCount
      setStatus(
        n > 1
          ? `PNG uploaded (${n} pages). Preview below. Then test send.`
          : 'PNG uploaded for email. Preview below. Then test send.',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (pngUploadRef.current) pngUploadRef.current.value = ''
    }
  }

  async function exportPng(fromMeta?: NewsletterCanvaMeta) {
    const meta = { ...canvaMeta, ...fromMeta }
    const designId = String(meta.canvaDesignId ?? '').trim()
    if (!designId) {
      setStatus('Attach a Canva design first, then Export PNG for email.')
      return
    }
    setBusy(true)
    setStatus('Exporting PNG from Canva…')
    try {
      const r = await fetch('/api/staff/canva/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Export failed')
      onCanvaMetaChange({
        ...meta,
        heroImageUrl: String(d.heroImageUrl ?? ''),
        heroImageKey: String(d.heroImageKey ?? ''),
        pageImageUrls: Array.isArray(d.pageImageUrls)
          ? d.pageImageUrls.map((u: unknown) => String(u)).filter(Boolean)
          : String(d.heroImageUrl ?? '')
            ? [String(d.heroImageUrl)]
            : [],
      })
      const n = Number(d.pageCount ?? 1)
      setStatus(
        n > 1
          ? `PNG exported (${n} pages). All pages go in the email. Preview below.`
          : 'PNG exported for email. Preview below. Then save template or send a test.',
      )
    } catch (err) {
      setStatus(
        (err instanceof Error ? err.message : 'Export failed') +
          '\nTry Upload PNG instead (Canva → Share → Download → PNG).',
      )
    } finally {
      setBusy(false)
    }
  }

  function loadSelected() {
    const tpl = templates.find((t) => t.id === selectedId)
    if (!tpl) {
      setStatus('Choose a saved template first.')
      return
    }
    onLoad({
      subject: tpl.subject,
      body: tpl.body,
      utmCampaign: tpl.utmCampaign,
      canvaViewUrl: tpl.canvaViewUrl,
      canvaThumbnailUrl: tpl.canvaThumbnailUrl,
      canvaTitle: tpl.canvaTitle,
      canvaDesignId: tpl.canvaDesignId,
      canvaEditUrl: tpl.canvaEditUrl,
      heroImageUrl: tpl.heroImageUrl,
      heroImageKey: tpl.heroImageKey,
      pageImageUrls: (() => {
        try {
          const parsed = JSON.parse(tpl.pageImageUrlsJson || '[]') as unknown
          return Array.isArray(parsed) ? parsed.map((u) => String(u)).filter(Boolean) : []
        } catch {
          return tpl.heroImageUrl ? [tpl.heroImageUrl] : []
        }
      })(),
      beatsJson: tpl.beatsJson,
      templateId: tpl.id,
    })
    setStatus(`Loaded “${tpl.name}”.`)
  }

  async function saveTemplate() {
    if (!body.trim()) {
      setStatus('Write a newsletter body before saving a template.')
      return
    }
    const name = window.prompt('Template name', subject.trim() || 'Newsletter template')
    if (!name?.trim()) return

    setBusy(true)
    setStatus('')
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
        utmCampaign: utmCampaign.trim(),
        canvaDesignId: canvaMeta.canvaDesignId ?? '',
        canvaTitle: canvaMeta.canvaTitle ?? '',
        canvaEditUrl: canvaMeta.canvaEditUrl ?? '',
        canvaViewUrl: canvaMeta.canvaViewUrl ?? '',
        canvaThumbnailUrl: canvaMeta.canvaThumbnailUrl ?? '',
        heroImageUrl: canvaMeta.heroImageUrl ?? '',
        heroImageKey: canvaMeta.heroImageKey ?? '',
        pageImageUrlsJson: JSON.stringify(canvaMeta.pageImageUrls ?? []),
        beatsJson,
        updatedAt: new Date().toISOString(),
        active: true,
      }
      const r = await fetch('/api/staff/cms/NewsletterTemplates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      await loadTemplates()
      if (d.id) setSelectedId(String(d.id))
      setStatus(`Saved template “${name.trim()}”.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const previewSrc = canvaMeta.heroImageUrl || canvaMeta.canvaThumbnailUrl

  return (
    <section
      id="newsletter-templates"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold">Templates (Canva + copy)</h2>
        <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
          Design = Canva PNG + fixed SHMS header (logo + title). Multi-page Canva exports every page into the email.
          Use sections for intro, events, reply prompts, CTAs, and sign-off. Body stays plain text (no HTML coding).
          {'\n'}
          Attach Canva → Export PNG or Upload PNG (optional top graphic) → write copy → test send.
          {'\n'}
          Each section can also have its own uploaded PNG (social / event graphic).
          {'\n'}
          Unsubscribe link and postal address are added to every send automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[12rem] text-xs text-[#5A6070]">
          Saved template
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#1A1A1A]"
          >
            <option value="">Choose…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" disabled={busy || !selectedId} onClick={loadSelected}>
          Load template
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !body.trim()}
          onClick={() => void saveTemplate()}
        >
          Save current as template
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[#FAFAF8] p-3 space-y-2">
        <p className="text-xs font-semibold text-[#1A1A1A]">Attach Canva design</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={canvaUrl}
            onChange={(e) => setCanvaUrl(e.target.value)}
            placeholder="Paste Canva design URL…"
            className="flex-1 min-w-[14rem] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <Button type="button" variant="outline" disabled={busy} onClick={importCanvaUrl}>
            Attach link
          </Button>
          <Button
            type="button"
            disabled={busy || !canvaMeta.canvaDesignId}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={() => void exportPng()}
          >
            Export PNG for email
          </Button>
          <input
            ref={pngUploadRef}
            type="file"
            accept="image/png"
            multiple
            className="hidden"
            onChange={(e) => void uploadPngFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => pngUploadRef.current?.click()}
          >
            Upload PNG
          </Button>
        </div>
        <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
          No Canva API? In Canva: Share → Download → PNG (all pages). Then Upload PNG here.
          Multi-page: select every page file at once, or upload one at a time (re-upload replaces).
        </p>
        {canvaConnected && canvaDesigns.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {canvaDesigns.slice(0, 6).map((d) => (
              <button
                key={d.id}
                type="button"
                className="text-left rounded-lg border border-[var(--border)] bg-white p-2 hover:border-[var(--brand-green)]"
                onClick={() => {
                  const next = {
                    canvaDesignId: d.id,
                    canvaTitle: d.title,
                    canvaEditUrl: d.editUrl,
                    canvaViewUrl: d.viewUrl,
                    canvaThumbnailUrl: d.thumbnailUrl,
                    heroImageUrl: '',
                    heroImageKey: '',
                  }
                  applyCanvaMeta(next)
                  setStatus(`Attached Canva: ${d.title}. Exporting PNG…`)
                  if (canvaConnected) void exportPng(next)
                }}
              >
                {d.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnailUrl} alt="" className="mb-1 h-16 w-full rounded object-cover" />
                ) : null}
                <span className="text-[11px] font-medium text-[#1A1A1A] line-clamp-2">{d.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[#5A6070]">
            Canva API not connected? Paste an edit/view link, then Connect Canva to export PNG.
          </p>
        )}
        {canvaMeta.canvaDesignId && !canvaMeta.heroImageUrl ? (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 whitespace-pre-line">
            Canva is attached but the email PNG is not ready yet.
            {'\n'}
            Click Export PNG for email, or Upload PNG from Canva Download, and wait for the preview before you test or send a paid newsletter.
          </p>
        ) : null}
        {canvaMeta.canvaViewUrl ? (
          <p className="text-[11px] text-[#5A6070] break-all">
            Attached: {canvaMeta.canvaTitle || canvaMeta.canvaDesignId}{' '}
            <a
              href={canvaMeta.canvaEditUrl || canvaMeta.canvaViewUrl}
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Open in Canva
            </a>
          </p>
        ) : null}
        {previewSrc ? (
          <div className="rounded-lg border border-[var(--border)] bg-white p-2 space-y-2">
            <p className="text-[11px] font-semibold text-[#5A6070]">
              {canvaMeta.heroImageUrl
                ? canvaMeta.pageImageUrls && canvaMeta.pageImageUrls.length > 1
                  ? `Email graphics (${canvaMeta.pageImageUrls.length} pages)`
                  : 'Email hero (exported PNG)'
                : 'Preview (thumbnail until export)'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(canvaMeta.pageImageUrls?.length
                ? canvaMeta.pageImageUrls
                : [previewSrc]
              ).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="max-h-40 w-auto rounded" />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {status ? <p className="text-sm text-[#1A1A1A] whitespace-pre-line">{status}</p> : null}
    </section>
  )
}
