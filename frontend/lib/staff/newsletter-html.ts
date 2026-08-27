import { applyMergeFields, type NewsletterMergeVars } from '@/lib/staff/newsletter-merge'
import {
  type NewsletterBeat,
  type NewsletterSections,
} from '@/lib/staff/newsletter-sections'
import {
  NEWSLETTER_BRANDING_DEFAULTS,
  resolveEmailHeaderLogoUrl,
  type NewsletterBranding,
} from '@/lib/staff/newsletter-branding'
import { tagUrlWithUtm, type UtmOpts } from '@/lib/staff/newsletter-utm'
import { newsletterSiteOrigin } from './newsletter-site'

/** Single sans-serif stack for all newsletter text. */
export const NEWSLETTER_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
export const NEWSLETTER_FONT_BODY = NEWSLETTER_FONT
export const NEWSLETTER_FONT_HEADING = NEWSLETTER_FONT

const SECTION_DIVIDER_PADDING = '28px 0 0'
const SECTION_INNER_PADDING = '0 0 4px'

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

/** Convert plain-text body to email-safe HTML (escape, line breaks, auto-link URLs). */
export function plainTextToEmailHtml(text: string): string {
  const escaped = escapeHtml(text).replace(/\r\n/g, '\n')
  const linked = escaped.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`
    return `<a href="${escapeHtml(href)}" style="color:#1B6B45;text-decoration:underline">${url}</a>`
  })
  return linked.replace(/\n/g, '<br />\n')
}

const FOOTER_TEXT_STYLE = `margin:0;font-family:${NEWSLETTER_FONT_BODY};font-size:12px;line-height:1.5;color:#5A6070;text-align:center`

function footerLineHtml(line: string, marginTop: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  const withLink = trimmed.replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`
    const label = url.replace(/^https?:\/\//, '')
    return `<a href="${escapeHtml(href)}" style="color:#1B6B45">${escapeHtml(label)}</a>`
  })
  return `<p style="margin:${marginTop};${FOOTER_TEXT_STYLE}">${withLink}</p>`
}

function footerHtml(
  origin: string,
  branding: NewsletterBranding,
  compliance?: { physicalAddress?: string; unsubscribeUrl?: string },
): string {
  const blocks: string[] = []
  const lines = branding.footerLines.length
    ? branding.footerLines
    : NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText.split('\n')
  lines.forEach((line, i) => {
    const html = footerLineHtml(line, i === 0 ? '0' : '6px 0 0')
    if (html) blocks.push(html)
  })
  const address = String(compliance?.physicalAddress ?? '').trim()
  if (address) {
    blocks.push(
      `<p style="margin:10px 0 0;${FOOTER_TEXT_STYLE}">${escapeHtml(address)}</p>`,
    )
  }
  const unsub = String(compliance?.unsubscribeUrl ?? '').trim()
  if (unsub) {
    blocks.push(
      `<p style="margin:10px 0 0;${FOOTER_TEXT_STYLE}"><a href="${escapeHtml(unsub)}" style="color:#1B6B45">Unsubscribe</a> from SHMS PTO emails</p>`,
    )
  }
  return blocks.join('\n')
}

function beatImageHtml(url: string, alt: string, linkUrl?: string): string {
  const safeUrl = escapeHtml(url.trim())
  if (!safeUrl) return ''
  const img = `<img src="${safeUrl}" alt="${escapeHtml(alt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:8px" />`
  const href = String(linkUrl ?? '').trim()
  const inner = href
    ? `<a href="${escapeHtml(href)}" style="text-decoration:none" target="_blank" rel="noopener noreferrer">${img}</a>`
    : img
  return `<div style="margin:0 0 14px">${inner}</div>`
}

function beatBlock(beat: NewsletterBeat, isFirst: boolean, utm?: UtmOpts): string {
  const heading = beat.heading.trim()
  const body = beat.body.trim()
  const imageUrl = String(beat.imageUrl ?? '').trim()
  if (!heading && !body && !imageUrl) return ''
  const border = isFirst ? '' : `border-top:1px solid #E2E8E4;`
  const title = heading
  const imageLink = String(beat.imageLinkUrl ?? '').trim()
  const imageLinkUrl =
    imageLink && utm ? tagUrlWithUtm(imageLink, { ...utm, content: 'beat-image' }) : imageLink
  const imageHtml = imageUrl
    ? beatImageHtml(imageUrl, title || 'Section image', imageLinkUrl || undefined)
    : ''
  const bodyHtml = body ? plainTextToEmailHtml(body) : ''
  return `<tr><td class="nl-section" style="padding:${SECTION_DIVIDER_PADDING};${border}">
    ${title ? `<p class="nl-section-title" style="margin:${SECTION_INNER_PADDING};font-family:${NEWSLETTER_FONT_HEADING};font-size:18px;font-weight:700;line-height:1.3;color:#1A1A1A">${escapeHtml(title)}</p>` : ''}
    ${imageHtml}
    ${bodyHtml ? `<div class="nl-body" style="font-family:${NEWSLETTER_FONT_BODY};font-size:15px;line-height:1.55;color:#1A1A1A">${bodyHtml}</div>` : ''}
  </td></tr>`
}

export function buildNewsletterSectionsHtml(
  sections: NewsletterSections,
  merge?: NewsletterMergeVars,
  utm?: UtmOpts,
): string {
  const apply = (t: string) => (merge ? applyMergeFields(t, merge) : t)
  const rows: string[] = []
  const intro = apply(sections.intro).trim()
  if (intro) {
    rows.push(`<tr><td style="font-family:${NEWSLETTER_FONT_BODY};font-size:15px;line-height:1.55;color:#1A1A1A">
      ${plainTextToEmailHtml(intro)}
    </td></tr>`)
  }
  const activeBeats = sections.beats.filter(
    (b) => b.heading.trim() || b.body.trim() || String(b.imageUrl ?? '').trim(),
  )
  activeBeats.forEach((beat, i) => {
    const block = beatBlock(
      {
        ...beat,
        heading: apply(beat.heading),
        body: apply(beat.body),
      },
      i === 0 && !intro,
      utm,
    )
    if (block) rows.push(block)
  })
  const signoff = apply(sections.signoff).trim()
  if (signoff) {
    rows.push(`<tr><td style="padding:${SECTION_DIVIDER_PADDING};border-top:1px solid #E2E8E4;font-family:${NEWSLETTER_FONT_BODY};font-size:15px;line-height:1.55;color:#1A1A1A">
      ${plainTextToEmailHtml(signoff)}
    </td></tr>`)
  }
  return rows.join('\n')
}

/**
 * Branded HTML newsletter: SHMS header | optional Canva PNG hero | body | footer.
 */
export function buildNewsletterHtml(opts: {
  textBody: string
  /** Pre-sanitized HTML fragment — used instead of plainTextToEmailHtml when set. */
  htmlBody?: string
  sections?: NewsletterSections | null
  branding?: NewsletterBranding
  sendId?: string
  heroImageUrl?: string
  extraImageUrls?: string[]
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  canvaTitle?: string
  physicalAddress?: string
  unsubscribeUrl?: string
  merge?: NewsletterMergeVars
  /** Tag header / hero shell links for GA when set. */
  utm?: UtmOpts
  /** Browser tab / SEO title for web editions. */
  documentTitle?: string
}): string {
  const origin = newsletterSiteOrigin()
  const utm = opts.utm
  const headerHref = utm
    ? tagUrlWithUtm(origin, { ...utm, content: 'header-logo' })
    : origin
  const branding = opts.branding ?? {
    headerTitle: NEWSLETTER_BRANDING_DEFAULTS.newsletterHeaderTitle,
    footerLines: NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText.split('\n'),
    headerLogoUrl: '',
    customCss: '',
  }
  const logoUrl = resolveEmailHeaderLogoUrl(branding.headerLogoUrl, origin)
  const heroUrl = (opts.heroImageUrl || opts.canvaThumbnailUrl || '').trim()
  const extra = (opts.extraImageUrls ?? [])
    .map((u) => String(u ?? '').trim())
    .filter((u) => u && u !== heroUrl)
  const linkHrefRaw = (opts.canvaViewUrl || origin).trim()
  const linkHref = utm
    ? tagUrlWithUtm(linkHrefRaw, { ...utm, content: 'hero' })
    : linkHrefRaw
  const heroAlt = escapeHtml(opts.canvaTitle?.trim() || 'SHMS PTO newsletter')
  const apply = (t: string) => (opts.merge ? applyMergeFields(t, opts.merge) : t)
  const useSections =
    opts.sections &&
    (opts.sections.intro.trim() ||
      opts.sections.beats.some(
        (b) => b.heading.trim() || b.body.trim() || String(b.imageUrl ?? '').trim(),
      ) ||
      opts.sections.signoff.trim())
  const richHtml = String(opts.htmlBody ?? '').trim()
  const bodyHtml = useSections
    ? buildNewsletterSectionsHtml(opts.sections!, opts.merge, utm)
    : `<tr><td style="font-family:${NEWSLETTER_FONT_BODY};font-size:15px;line-height:1.55;color:#1A1A1A">
            ${richHtml ? apply(richHtml) : plainTextToEmailHtml(apply(opts.textBody))}
          </td></tr>`
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

  const customCssBlock = branding.customCss.trim()
    ? `<style type="text/css">${branding.customCss}</style>`
    : ''

  return `<!DOCTYPE html>
<html lang="en" class="nl-wrap">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.documentTitle?.trim() || branding.headerTitle || 'Newsletter')}</title>${customCssBlock}</head>
<body class="nl-wrap" style="margin:0;padding:0;background:#F4F7F5;font-family:${NEWSLETTER_FONT}">
${pixel}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8E4">
      <tr><td class="nl-header" style="background:#1B6B45;padding:16px 20px;text-align:center">
        <a href="${escapeHtml(headerHref)}" style="text-decoration:none">
          <img src="${escapeHtml(logoUrl)}" alt="SHMS PTO" width="120" style="display:inline-block;height:auto;border:0;max-width:120px" />
        </a>
        <p class="nl-header-title" style="margin:10px 0 0;font-family:${NEWSLETTER_FONT};font-size:16px;color:#ffffff;letter-spacing:0.02em">${escapeHtml(branding.headerTitle)}</p>
      </td></tr>
      <tr><td style="padding:24px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${heroBlock}
          ${extraBlocks}
          ${bodyHtml}
        </table>
      </td></tr>
      <tr><td class="nl-footer" style="padding:16px 20px 20px;border-top:1px solid #E2E8E4">
        ${footerHtml(origin, branding, {
          physicalAddress: opts.physicalAddress,
          unsubscribeUrl: opts.unsubscribeUrl,
        })}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
