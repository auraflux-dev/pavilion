/**
 * Staff CMS copy: plain text with real newlines. No HTML authoring.
 * Converts pasted HTML (Word, Docs, old <br> CMS rows) into readable plain copy.
 */

function stripMarkupToText(input: string): string {
  let s = String(input ?? '')
  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n')
    .replace(/<\s*\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\s*\/\s*tr\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/\s*li\s*>/gi, '')
    .replace(/<\s*\/\s*ul\s*>/gi, '\n')
    .replace(/<\s*\/\s*ol\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n)
      return Number.isFinite(code) ? String.fromCharCode(code) : ''
    })
  return s
}

/** True when the string still looks like markup (tags or HTML entities as content). */
export function looksLikeHtmlCopy(input: string): boolean {
  const s = String(input ?? '')
  return /<\s*\/?\s*[a-z][^>]*>/i.test(s) || /&nbsp;|&amp;|&lt;|&gt;/i.test(s)
}

export function htmlToPlainCopy(input: string): string {
  if (!input) return ''
  return normalizePlainCopy(stripMarkupToText(input))
}

/**
 * Normalize staff / CMS body copy to plain text with real newlines.
 * If HTML is detected, convert first; otherwise just normalize whitespace.
 */
export function normalizePlainCopy(input: string): string {
  if (!input) return ''
  let s = String(input)
  if (looksLikeHtmlCopy(s)) s = stripMarkupToText(s)
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
    .trim()
}

/** For display: ensure legacy HTML CMS rows become plain before public render. */
export function toPublicPlainCopy(input: string): string {
  return looksLikeHtmlCopy(input) ? htmlToPlainCopy(input) : normalizePlainCopy(input)
}
