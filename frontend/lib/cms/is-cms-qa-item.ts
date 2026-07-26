/**
 * Strip CMS draft / layout-QA rows from public surfaces.
 * Wix Content Manager often leaves items `active: true` with [QA] titles.
 */
export function isCmsQaItem(...parts: Array<string | null | undefined>): boolean {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase()
  if (!haystack.trim()) return false
  return (
    /\[qa\]/.test(haystack) ||
    /\bqa[\s_-]?only\b/.test(haystack) ||
    /\blayout\s+qa\b/.test(haystack) ||
    /\bfor\s+layout\s+qa\b/.test(haystack) ||
    /\btemp(?:orary)?\s+cta\b/.test(haystack)
  )
}
