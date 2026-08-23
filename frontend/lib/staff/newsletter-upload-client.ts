/** Browser upload for newsletter PNGs (Canva Download → R2). */

export type NewsletterPngUploadResult = {
  heroImageUrl: string
  heroImageKey: string
  pageImageUrls: string[]
  pageImageKeys: string[]
  pageCount: number
}

export async function uploadNewsletterPngFiles(
  files: FileList | File[],
): Promise<NewsletterPngUploadResult> {
  const list = files instanceof FileList ? Array.from(files) : files
  if (!list.length) throw new Error('Choose a PNG file to upload.')

  const form = new FormData()
  list.forEach((file) => form.append('files', file))

  const r = await fetch('/api/staff/newsletter/upload-png', {
    method: 'POST',
    body: form,
  })
  const d = await r.json()
  if (!r.ok) throw new Error(String(d.error ?? 'PNG upload failed'))

  const pageImageUrls = Array.isArray(d.pageImageUrls)
    ? d.pageImageUrls.map((u: unknown) => String(u)).filter(Boolean)
    : String(d.heroImageUrl ?? '')
      ? [String(d.heroImageUrl)]
      : []
  const pageImageKeys = Array.isArray(d.pageImageKeys)
    ? d.pageImageKeys.map((k: unknown) => String(k)).filter(Boolean)
    : String(d.heroImageKey ?? '')
      ? [String(d.heroImageKey)]
      : []

  return {
    heroImageUrl: String(d.heroImageUrl ?? pageImageUrls[0] ?? ''),
    heroImageKey: String(d.heroImageKey ?? pageImageKeys[0] ?? ''),
    pageImageUrls,
    pageImageKeys,
    pageCount: Number(d.pageCount ?? pageImageUrls.length) || pageImageUrls.length,
  }
}
