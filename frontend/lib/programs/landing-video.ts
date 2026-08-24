/** Resolve program landing video: uploaded MP4 (Wix Media) or YouTube embed. */

export type LandingVideoRender =
  | { kind: 'youtube'; embedSrc: string }
  | { kind: 'file'; src: string }
  | null

const VIDEO_FILE_HINT =
  /\.(mp4|webm|mov|m4v)(\?|#|$)/i

function youtubeEmbedSrc(url: string): string | null {
  const raw = String(url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      const parts = u.pathname.split('/').filter(Boolean)
      const emb = parts[0] === 'embed' ? parts[1] : parts[0] === 'shorts' ? parts[1] : null
      return emb ? `https://www.youtube.com/embed/${emb}` : null
    }
  } catch {
    return null
  }
  return null
}

function isDirectVideoUrl(url: string): boolean {
  const raw = url.trim()
  if (!raw) return false
  if (VIDEO_FILE_HINT.test(raw)) return true
  if (raw.includes('video.wixstatic.com')) return true
  if (raw.includes('wixstatic.com') && raw.includes('/video/')) return true
  return false
}

export function resolveLandingVideo(url: string | undefined): LandingVideoRender {
  const raw = String(url ?? '').trim()
  if (!raw) return null
  const youtube = youtubeEmbedSrc(raw)
  if (youtube) return { kind: 'youtube', embedSrc: youtube }
  if (isDirectVideoUrl(raw) || /^https?:\/\//i.test(raw)) {
    return { kind: 'file', src: raw }
  }
  return null
}
