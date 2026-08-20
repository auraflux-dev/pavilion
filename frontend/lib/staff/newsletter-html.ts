import { newsletterSiteOrigin } from './newsletter-site'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openPixelUrl(sendId: string): string {
  return `${newsletterSiteOrigin()}/api/o/${encodeURIComponent(sendId)}`
}

/** Convert plain-text body to email-safe HTML (escape + preserve line breaks). */
export function plainTextToEmailHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br />\n')
}

/**
 * Branded HTML newsletter: SHMS header | optional Canva PNG hero | plain body | footer.
 * Always returns HTML for Gmail sends (multipart with text fallback elsewhere).
 */
export function buildNewsletterHtml(opts: {
  textBody: string
  sendId?: string
  heroImageUrl?: string
  extraImageUrls?: string[]
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  canvaTitle?: string
}): string {
  const origin = newsletterSiteOrigin()
  const logoUrl = `${origin}/brand/cove-logo-640.png`
  const heroUrl = (opts.heroImageUrl || opts.canvaThumbnailUrl || '').trim()
  const extra = (opts.extraImageUrls ?? [])
    .map((u) => String(u ?? '').trim())
    .filter((u) => u && u !== heroUrl)
  const linkHref = (opts.canvaViewUrl || origin).trim()
  const heroAlt = escapeHtml(opts.canvaTitle?.trim() || 'SHMS PTO newsletter')
  const bodyHtml = plainTextToEmailHtml(opts.textBody)
  const pixel =
    opts.sendId
      ? `<img src="${escapeHtml(openPixelUrl(opts.sendId))}" width="1" height="1" alt="" style="display:block;border:0;outline:none;width:1px;height:1px" />`
      : ''

  const imageBlock = (url: string, alt: string) =>
    `<tr><td style="padding:0 0 20px">
        <a href="${escapeHtml(linkHref)}" style="text-decoration:none">
          <img src="${escapeHtml(url)}" alt="${alt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:8px" />
        </a>
      </td></tr>`

  const heroBlock = heroUrl ? imageBlock(heroUrl, heroAlt) : ''
  const extraBlocks = extra
    .map((url, i) => imageBlock(url, `${heroAlt} page ${i + 2}`))
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SHMS PTO</title></head>
<body style="margin:0;padding:0;background:#F4F7F5">
${pixel}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8E4">
      <tr><td style="background:#1B6B45;padding:16px 20px;text-align:center">
        <a href="${escapeHtml(origin)}" style="text-decoration:none">
          <img src="${escapeHtml(logoUrl)}" alt="SHMS PTO" width="120" style="display:inline-block;height:auto;border:0;max-width:120px" />
        </a>
        <p style="margin:10px 0 0;font-family:Georgia,serif;font-size:16px;color:#ffffff;letter-spacing:0.02em">SHMS PTO</p>
      </td></tr>
      <tr><td style="padding:24px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${heroBlock}
          ${extraBlocks}
          <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.55;color:#1A1A1A">
            ${bodyHtml}
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 20px 20px;border-top:1px solid #E2E8E4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#5A6070;text-align:center">
        Stone Hill Middle School PTO<br />
        <a href="${escapeHtml(origin)}" style="color:#1B6B45">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a>
        · Reply to this email with questions
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
