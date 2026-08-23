'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'
import type { NewsletterHeroMeta } from '@/lib/staff/newsletter-hero-meta'

type Props = {
  heroImageUrl: string
  pageImageUrls: string[]
  onChange: (meta: Pick<NewsletterHeroMeta, 'heroImageUrl' | 'heroImageKey' | 'pageImageUrls'>) => void
}

/** Hero PNG upload only (no Canva / copy templates). */
export function StaffNewsletterHeroPanel({ heroImageUrl, pageImageUrls, onChange }: Props) {
  const pngUploadRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function uploadPngFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setBusy(true)
    setStatus('')
    try {
      const d = await uploadNewsletterPngFiles(fileList)
      onChange({
        heroImageUrl: d.heroImageUrl,
        heroImageKey: d.heroImageKey,
        pageImageUrls: d.pageImageUrls,
      })
      const n = d.pageCount
      setStatus(
        n > 1
          ? `Uploaded ${n} PNG pages. Preview below.`
          : 'Hero PNG uploaded. Preview below.',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (pngUploadRef.current) pngUploadRef.current.value = ''
    }
  }

  const previews = pageImageUrls.length ? pageImageUrls : heroImageUrl ? [heroImageUrl] : []

  return (
    <div className="space-y-3">
      <input
        ref={pngUploadRef}
        type="file"
        accept="image/png"
        multiple
        className="hidden"
        onChange={(e) => void uploadPngFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => pngUploadRef.current?.click()}
        >
          {heroImageUrl ? 'Replace hero PNG' : 'Upload hero PNG'}
        </Button>
        {heroImageUrl ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              onChange({ heroImageUrl: '', heroImageKey: '', pageImageUrls: [] })
              setStatus('Hero image removed.')
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-[#5A6070]">
        Optional top graphic in the email. PNG from Canva Download or any design tool.
      </p>
      {status ? (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            status.includes('failed') || status.includes('R2')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-[#E8F3E8] text-[#1A1A1A] border border-[var(--brand-green)]/25'
          }`}
        >
          {status}
        </p>
      ) : null}
      {previews.length ? (
        <div className="rounded-lg border-2 border-[var(--brand-green)]/40 bg-[#FAFCF9] p-3 space-y-2">
          <p className="text-xs font-semibold text-[var(--brand-green)]">
            ✓ Hero graphic ready ({previews.length} page{previews.length === 1 ? '' : 's'})
          </p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="max-h-40 w-auto rounded border border-[var(--border)]" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
