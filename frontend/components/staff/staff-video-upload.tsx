'use client'

/**
 * MP4 (or WebM/MOV) upload for program landing videos.
 * Uploads to Wix Media via /api/staff/media/upload, then calls onUploaded(url).
 */
import { useRef, useState } from 'react'
import { Play, Loader2 } from 'lucide-react'

export type StaffVideoUploadResult = {
  url: string
  id?: string
}

type Props = {
  label?: string
  currentUrl?: string | null
  onUploaded: (result: StaffVideoUploadResult) => void | Promise<void>
  onClear?: () => void | Promise<void>
  disabled?: boolean
}

export function StaffVideoUpload({
  label = 'Class intro video',
  currentUrl,
  onUploaded,
  onClear,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onFile(file: File | null) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('kind', 'video')
      const r = await fetch('/api/staff/media/upload', { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      await onUploaded({
        url: String(d.url),
        id: typeof d.id === 'string' ? d.id : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const hasVideo = Boolean(currentUrl?.trim())

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <p className="text-xs font-semibold text-[#5A6070]">{label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-28 h-16 rounded-lg border border-[var(--border)] bg-[#1A1A1A] overflow-hidden shrink-0 flex items-center justify-center">
          {hasVideo ? (
            <video
              src={currentUrl!}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Play className="w-6 h-6 text-white/70" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 text-xs font-bold underline disabled:opacity-50"
              style={{ color: 'var(--brand-green)' }}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  Uploading…
                </>
              ) : hasVideo ? (
                'Replace video'
              ) : (
                'Upload MP4'
              )}
            </button>
            {hasVideo && onClear ? (
              <button
                type="button"
                disabled={disabled || busy}
                className="text-xs font-semibold text-[#5A6070] underline disabled:opacity-50"
                onClick={() => void onClear()}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-[10px] text-[#5A6070] whitespace-pre-line">
            {`MP4, WebM, or MOV. Up to 50 MB.
Plays on the landing page below the class title.`}
          </p>
          {hasVideo ? (
            <p className="text-[10px] text-[#8A9099] break-all line-clamp-2">{currentUrl}</p>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  )
}
