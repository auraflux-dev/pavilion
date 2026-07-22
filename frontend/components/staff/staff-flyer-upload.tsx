'use client'

/**
 * Compact flyer / photo uploader for staff panels.
 * Uploads to Wix Media via /api/staff/media/upload, then calls onUploaded(url).
 */
import { useRef, useState } from 'react'

type Props = {
  label?: string
  currentUrl?: string | null
  onUploaded: (url: string) => void | Promise<void>
  disabled?: boolean
}

export function StaffFlyerUpload({
  label = 'Flyer / photo',
  currentUrl,
  onUploaded,
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
      const r = await fetch('/api/staff/media/upload', { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      await onUploaded(String(d.url))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-16 h-16 rounded-lg border border-[#E8E4DC] bg-[#FAFAF8] overflow-hidden shrink-0">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#5A6070] px-1 text-center">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#5A6070]">{label}</p>
          <button
            type="button"
            disabled={disabled || busy}
            className="text-xs font-bold underline disabled:opacity-50"
            style={{ color: '#085508' }}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Uploading…' : currentUrl ? 'Replace flyer' : 'Upload flyer'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  )
}
