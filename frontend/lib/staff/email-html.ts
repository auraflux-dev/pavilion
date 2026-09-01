/**
 * Lightweight HTML helpers for Staff outreach / branded email bodies.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'div',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
])

/** Strip to plain text for portal inbox / WhatsApp / text-part MIME. */
export function htmlToPlainText(html: string): string {
  return String(html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Allow only safe email markup tags. Drops scripts/styles/event handlers.
 * Good enough for Staff contentEditable output.
 */
export function sanitizeEmailHtml(input: string): string {
  const raw = String(input ?? '').trim()
  if (!raw) return ''

  let html = raw
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, '')

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string, attrs = '') => {
    const name = tag.toLowerCase()
    const closing = full.startsWith('</')
    if (!ALLOWED_TAGS.has(name)) return ''
    if (closing) return `</${name}>`
    if (name === 'br') return '<br />'
    if (name === 'a') {
      const hrefMatch = String(attrs).match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const href = (hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '').trim()
      if (!href || /^(javascript|data):/i.test(href)) return '<a>'
      const safe = href.replace(/"/g, '&quot;')
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`
    }
    return `<${name}>`
  })

  return html.replace(/(<div><br\s*\/?><\/div>)+/gi, '<br />').trim()
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(String(value ?? ''))
}
