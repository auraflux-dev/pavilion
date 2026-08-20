/** Parse a Canva design URL into stable edit/view links + design id. */
export function parseCanvaDesignUrl(raw: string): {
  designId: string
  editUrl: string
  viewUrl: string
} | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  let url: URL
  try {
    url = new URL(s)
  } catch {
    return null
  }
  if (!/canva\.com$/i.test(url.hostname.replace(/^www\./, '')) && !url.hostname.includes('canva.com')) {
    return null
  }
  const m = url.pathname.match(/\/design\/([A-Za-z0-9_-]+)/)
  if (!m?.[1]) return null
  const designId = m[1]
  const base = `https://www.canva.com/design/${designId}`
  return {
    designId,
    editUrl: `${base}/edit`,
    viewUrl: `${base}/view`,
  }
}
