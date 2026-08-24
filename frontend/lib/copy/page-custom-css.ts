/**
 * Sanitize per-page custom CSS before injecting on public/member/staff surfaces.
 * Scope rules under `.page-{slug}` in Staff → Page CSS to avoid site-wide bleed.
 */

const BLOCKED_PATTERNS = [
  /@import\b/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /behavior\s*:/gi,
  /-moz-binding/gi,
  /<\/style/gi,
  /<script/gi,
]

export function pageThemeClassName(pageKey: string): string {
  const slug = String(pageKey ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `page-${slug}` : 'page-root'
}

/** Strip dangerous constructs. Returns empty when nothing safe remains. */
export function sanitizePageCustomCss(raw: string): string {
  let css = String(raw ?? '').trim()
  if (!css) return ''

  for (const pattern of BLOCKED_PATTERNS) {
    css = css.replace(pattern, '/* blocked */')
  }

  return css.trim()
}
