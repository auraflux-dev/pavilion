import { openPixelUrl } from '@/lib/staff/newsletter-tracking'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Minimal HTML wrapper for open tracking + optional Canva hero image. */
export function buildNewsletterHtml(opts: {
  textBody: string
  sendId?: string
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  canvaTitle?: string
}): string | undefined {
  if (!opts.sendId && !opts.canvaThumbnailUrl) return undefined

  const parts: string[] = []
  if (opts.sendId) {
    parts.push(
      `<img src="${escapeHtml(openPixelUrl(opts.sendId))}" width="1" height="1" alt="" style="display:block;border:0;outline:none" />`,
    )
  }
  if (opts.canvaThumbnailUrl && opts.canvaViewUrl) {
    const title = escapeHtml(opts.canvaTitle?.trim() || 'View newsletter design')
    parts.push(
      `<p style="margin:0 0 16px"><a href="${escapeHtml(opts.canvaViewUrl)}" style="text-decoration:none;color:#1A1A1A"><img src="${escapeHtml(opts.canvaThumbnailUrl)}" alt="${title}" style="max-width:100%;height:auto;border-radius:8px" /><br /><span style="font-size:14px;color:#1B6B45">${title}</span></a></p>`,
    )
  }
  parts.push(
    `<div style="white-space:pre-wrap;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A">${escapeHtml(opts.textBody)}</div>`,
  )

  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#FAFAF8">${parts.join('')}</body></html>`
}
