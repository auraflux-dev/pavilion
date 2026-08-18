'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CreativeKind, FacebookFormat, SiteAssetType, SocialMediaItem } from '@/lib/social/types'

type Props = {
  enabled: boolean
}

const FORMATS: { id: FacebookFormat; label: string }[] = [
  { id: 'POST', label: 'Post' },
  { id: 'REEL', label: 'Reel' },
  { id: 'STORY', label: 'Story' },
]

const KINDS: { id: CreativeKind; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Link' },
  { id: 'gallery', label: 'Gallery' },
]

const ASSET_TYPES: { id: SiteAssetType; label: string }[] = [
  { id: 'BLOG_POST', label: 'Blog post' },
  { id: 'EVENT', label: 'Event' },
  { id: 'STORES_PRODUCT', label: 'Store product' },
  { id: 'BOOKINGS_SERVICE', label: 'Bookings service' },
  { id: 'STORES_COUPON', label: 'Coupon' },
  { id: 'STORES_CATEGORY', label: 'Store category' },
]

export function SocialComposePanel({ enabled }: Props) {
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [format, setFormat] = useState<FacebookFormat>('POST')
  const [kind, setKind] = useState<CreativeKind>('text')
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [gallery, setGallery] = useState<SocialMediaItem[]>([])
  const [linkTitle, setLinkTitle] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [linkThumb, setLinkThumb] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [assetType, setAssetType] = useState<SiteAssetType | ''>('')
  const [assetId, setAssetId] = useState('')
  const [assetName, setAssetName] = useState('')
  const [facebookReady, setFacebookReady] = useState(false)
  const [instagramAvailable, setInstagramAvailable] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)

  useEffect(() => {
    if (!enabled) return
    fetch('/api/staff/social')
      .then((r) => r.json())
      .then((d) => {
        setFacebookReady(Boolean(d.facebookReady))
        setInstagramAvailable(Boolean(d.instagramAvailable))
      })
      .catch(() => undefined)
  }, [enabled])

  useEffect(() => {
    if (format === 'REEL') setKind('video')
    if (format === 'STORY' && kind === 'text') setKind('image')
    if (format === 'STORY' && kind === 'link') setKind('image')
  }, [format, kind])

  async function uploadFile(file: File, target: 'image' | 'video' | 'gallery' | 'thumb') {
    setUploadBusy(true)
    setMsg('')
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/staff/social/media', { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      const url = String(d.file?.url ?? '')
      const fileId = String(d.file?.id ?? '')
      const mediaType = String(d.file?.mediaType ?? '').toUpperCase().includes('VIDEO')
        ? 'VIDEO'
        : 'IMAGE'
      if (!url) throw new Error('Upload succeeded but no media URL returned')
      if (target === 'image') setImageUrl(url)
      if (target === 'video') setVideoUrl(url)
      if (target === 'thumb') setLinkThumb(url)
      if (target === 'gallery') {
        setGallery((prev) => [...prev, { type: mediaType, url, fileId }])
      }
      setMsg(`Uploaded to Media Manager: ${d.file?.displayName || 'file'}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadBusy(false)
    }
  }

  async function importUrl(rawUrl: string, target: 'image' | 'video' | 'gallery' | 'thumb') {
    const url = rawUrl.trim()
    if (!url) return
    setUploadBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/staff/social/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Import failed')
      const imported = String(d.file?.url ?? '')
      const fileId = String(d.file?.id ?? '')
      const mediaType = String(d.file?.mediaType ?? '').toUpperCase().includes('VIDEO')
        ? 'VIDEO'
        : 'IMAGE'
      if (!imported) throw new Error('Import succeeded but no media URL returned')
      if (target === 'image') setImageUrl(imported)
      if (target === 'video') setVideoUrl(imported)
      if (target === 'thumb') setLinkThumb(imported)
      if (target === 'gallery') {
        setGallery((prev) => [...prev, { type: mediaType, url: imported, fileId }])
      }
      setMsg('Imported into Media Manager.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setUploadBusy(false)
    }
  }

  async function submit(saveOnly: boolean) {
    setBusy(true)
    setMsg('')
    try {
      const scheduledAt =
        !saveOnly && scheduleMode === 'later' && scheduledLocal
          ? new Date(scheduledLocal).toISOString()
          : undefined

      const r = await fetch('/api/staff/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          format,
          text,
          saveOnly,
          scheduledAt,
          creative: {
            kind: format === 'REEL' ? 'video' : format === 'STORY' ? kind : kind,
            imageUrl: imageUrl || undefined,
            videoUrl: videoUrl || undefined,
            linkUrl: linkUrl || undefined,
            media: kind === 'gallery' || format === 'STORY' ? gallery : undefined,
            linkMetadata:
              kind === 'link'
                ? {
                    title: linkTitle || undefined,
                    description: linkDescription || undefined,
                    thumbnailUrl: linkThumb || undefined,
                  }
                : undefined,
          },
          siteAsset:
            assetType && assetId
              ? { type: assetType, id: assetId, name: assetName || undefined }
              : undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Publish failed')
      if (d.ok) {
        setMsg(
          saveOnly
            ? 'Draft saved in SocialPosts.'
            : d.status === 'scheduled'
              ? `Scheduled.${d.externalId ? ` Ref: ${d.externalId}` : ''}`
              : `Published.${d.externalId ? ` ${d.externalId}` : ''}`
        )
        if (!saveOnly) {
          setText('')
          setImageUrl('')
          setVideoUrl('')
          setLinkUrl('')
          setGallery([])
          setLinkTitle('')
          setLinkDescription('')
          setLinkThumb('')
          setAssetId('')
          setAssetName('')
        }
      } else {
        setMsg(d.error ?? 'Publish failed. draft saved in SocialPosts.')
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) return null

  const publishDisabled =
    busy ||
    uploadBusy ||
    (platform === 'instagram' && !instagramAvailable) ||
    (platform === 'facebook' && !facebookReady) ||
    (format !== 'STORY' && !text.trim()) ||
    (format === 'REEL' && !videoUrl) ||
    (format === 'STORY' && gallery.length === 0 && !imageUrl && !videoUrl) ||
    (platform === 'instagram' && format === 'POST' && !imageUrl && !videoUrl && gallery.length === 0) ||
    (format === 'POST' && kind === 'image' && !imageUrl) ||
    (format === 'POST' && kind === 'video' && !videoUrl) ||
    (format === 'POST' && kind === 'link' && !linkUrl) ||
    (format === 'POST' && kind === 'gallery' && gallery.length === 0) ||
    (scheduleMode === 'later' && !scheduledLocal)

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${
      active ? 'border-[var(--brand-green)] bg-[var(--brand-soft)]' : 'border-[var(--border)]'
    }`

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <h2 className="text-lg font-bold">Marketing · Facebook & Instagram</h2>
      <p className="text-xs text-[#5A6070]">
        Publish via Wix Social Publisher. Facebook supports post / reel / story. Instagram supports
        post and story (image or video required).
        {facebookReady ? ' · Facebook ready.' : ' · Facebook not ready.'}
        {instagramAvailable ? ' · Instagram ready.' : ' · Instagram not connected.'}
      </p>

      <div className="flex flex-wrap gap-2">
        {(['facebook', 'instagram'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPlatform(p)
              if (p === 'instagram' && format === 'REEL') setFormat('POST')
            }}
            className={`${chip(platform === p)} ${p === 'instagram' && !instagramAvailable ? 'opacity-60' : ''}`}
          >
            {p === 'instagram' && !instagramAvailable ? 'instagram (connect in Wix)' : p}
          </button>
        ))}
      </div>

      {platform === 'instagram' && !instagramAvailable ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Connect Instagram in Wix Dashboard → Marketing & SEO → Social, then refresh this page. We
          auto-detect the account id.
        </p>
      ) : null}
      {platform === 'instagram' && instagramAvailable ? (
        <p className="text-xs text-[#5A6070]">
          Instagram posts need an image or video. Caption-only is not supported by Meta.
        </p>
      ) : null}

      <div>
        <p className="text-xs font-bold text-[#5A6070] mb-1">Format</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.filter((f) => platform !== 'instagram' || f.id !== 'REEL').map((f) => (
            <button key={f.id} type="button" onClick={() => setFormat(f.id)} className={chip(format === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {format === 'POST' ? (
        <div>
          <p className="text-xs font-bold text-[#5A6070] mb-1">Creative</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} className={chip(kind === k.id)}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={format === 'REEL' ? 'Reel description' : format === 'STORY' ? 'Optional note (stories are media-first)' : 'Caption / post text'}
        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
      />

      {(format === 'POST' && (kind === 'image' || kind === 'gallery')) || format === 'STORY' ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#5A6070]">Image</p>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (will import to Media Manager if needed)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-bold border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer">
              {uploadBusy ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadFile(f, kind === 'gallery' || format === 'STORY' ? 'gallery' : 'image')
                  e.target.value = ''
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={uploadBusy || !imageUrl}
              onClick={() => void importUrl(imageUrl, kind === 'gallery' || format === 'STORY' ? 'gallery' : 'image')}
            >
              Import URL to Media Manager
            </Button>
          </div>
        </div>
      ) : null}

      {(format === 'REEL' || (format === 'POST' && kind === 'video') || format === 'STORY') ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#5A6070]">Video</p>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL (Wix Media Manager preferred)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-bold border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer">
              {uploadBusy ? 'Uploading…' : 'Upload video'}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadFile(f, format === 'STORY' ? 'gallery' : 'video')
                  e.target.value = ''
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={uploadBusy || !videoUrl}
              onClick={() => void importUrl(videoUrl, format === 'STORY' ? 'gallery' : 'video')}
            >
              Import URL to Media Manager
            </Button>
          </div>
        </div>
      ) : null}

      {format === 'POST' && kind === 'link' ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#5A6070]">Link preview</p>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Link URL"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Preview title (optional)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={linkDescription}
            onChange={(e) => setLinkDescription(e.target.value)}
            placeholder="Preview description (optional)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={linkThumb}
            onChange={(e) => setLinkThumb(e.target.value)}
            placeholder="Preview thumbnail URL (optional)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <label className="inline-block text-xs font-bold border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer">
            Upload thumbnail
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadBusy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadFile(f, 'thumb')
                e.target.value = ''
              }}
            />
          </label>
        </div>
      ) : null}

      {(kind === 'gallery' || format === 'STORY') && gallery.length > 0 ? (
        <ul className="text-xs space-y-1 text-[#5A6070]">
          {gallery.map((m, i) => (
            <li key={`${m.url}-${i}`} className="flex items-center justify-between gap-2 border border-[var(--border)] rounded-lg px-2 py-1">
              <span className="truncate">
                {m.type}: {m.url}
              </span>
              <button
                type="button"
                className="underline shrink-0"
                onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#5A6070]">Schedule</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(scheduleMode === 'now')} onClick={() => setScheduleMode('now')}>
            Publish now
          </button>
          <button type="button" className={chip(scheduleMode === 'later')} onClick={() => setScheduleMode('later')}>
            Schedule
          </button>
        </div>
        {scheduleMode === 'later' ? (
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            className="w-full sm:max-w-xs border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#5A6070]">Promote site asset (optional)</p>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as SiteAssetType | '')}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">None</option>
          {ASSET_TYPES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {assetType ? (
          <>
            <input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Asset ID (CMS / catalog GUID)"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy || uploadBusy || (format !== 'STORY' && !text.trim())}
          onClick={() => void submit(true)}
          variant="outline"
        >
          Save draft
        </Button>
        <Button
          disabled={publishDisabled}
          onClick={() => void submit(false)}
          className="text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? '…' : scheduleMode === 'later' ? 'Schedule' : 'Publish'}
        </Button>
      </div>
      {msg ? <p className="text-xs text-[#5A6070]">{msg}</p> : null}
      <p className="text-xs text-[#5A6070]">
        Media must end up in Wix Media Manager (`static.wixstatic.com` / `video.wixstatic.com`). Upload
        or Import before publish when pasting external URLs.
      </p>
    </section>
  )
}
