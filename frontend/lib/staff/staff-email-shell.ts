/**
 * Shared header/footer shell for staff-sent HTML (newsletters use buildNewsletterHtml).
 */
import {
  NEWSLETTER_BRANDING_DEFAULTS,
  type NewsletterBranding,
} from '@/lib/staff/newsletter-branding'
import { NEWSLETTER_FONT_BODY, NEWSLETTER_FONT_HEADING } from '@/lib/staff/newsletter-html'
import { newsletterSiteOrigin } from '@/lib/staff/newsletter-site'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wrap a fragment (paragraphs, not full document) in branded staff email shell. */
export function wrapStaffEmailBody(innerHtml: string, branding?: NewsletterBranding): string {
  const origin = newsletterSiteOrigin()
  const b = branding ?? {
    headerTitle: NEWSLETTER_BRANDING_DEFAULTS.newsletterHeaderTitle,
    footerLines: NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText.split('\n'),
    headerLogoUrl: '',
    customCss: '',
  }
  const logoUrl = b.headerLogoUrl.trim() || `${origin}/brand/cove-logo-640.png`
  const footer = b.footerLines
    .map(
      (line, i) =>
        `<p style="margin:${i === 0 ? '0' : '6px 0 0'};font-family:${NEWSLETTER_FONT_BODY};font-size:12px;line-height:1.5;color:#5A6070;text-align:center">${escapeHtml(line)}</p>`,
    )
    .join('\n')
  const customCss = b.customCss.trim()
    ? `<style type="text/css">${b.customCss}</style>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />${customCss}</head>
<body style="margin:0;padding:0;background:#F4F7F5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8E4">
      <tr><td style="background:#1B6B45;padding:16px 20px;text-align:center">
        <a href="${escapeHtml(origin)}" style="text-decoration:none">
          <img src="${escapeHtml(logoUrl)}" alt="SHMS PTO" width="120" style="display:inline-block;height:auto;border:0;max-width:120px" />
        </a>
        <p style="margin:10px 0 0;font-family:${NEWSLETTER_FONT_HEADING};font-size:16px;color:#ffffff">${escapeHtml(b.headerTitle)}</p>
      </td></tr>
      <tr><td style="padding:24px 20px;font-family:${NEWSLETTER_FONT_BODY};font-size:15px;line-height:1.55;color:#1A1A1A">
        ${innerHtml}
      </td></tr>
      <tr><td style="padding:16px 20px 20px;border-top:1px solid #E2E8E4">${footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

/** Plain text → simple HTML paragraph block inside the shell. */
export function wrapStaffEmailPlainText(text: string, branding?: NewsletterBranding): string {
  const inner = escapeHtml(text)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br />\n')
  return wrapStaffEmailBody(inner, branding)
}
