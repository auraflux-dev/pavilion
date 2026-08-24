/**
 * Roll prior-year school labels (2025-26) forward to the current year (2026-27).
 * Use on visitor / portal marketing copy only. Do not use on historical budget notes.
 */
export function rollForwardSchoolYearCopy(text: string): string {
  if (!text) return text
  return text
    .replace(/2025\s*[–—-]\s*2026/g, '2026-27')
    .replace(/2025\s*[–—-]\s*26\b/g, '2026-27')
    .replace(/\b2025\s+to\s+2026\b/gi, '2026 to 2027')
    .replace(/\b2025\s+to\s+26\b/gi, '2026-27')
    // humanizePublicCopy turns 2026-27 into "2026 to 27"; put the year label back.
    .replace(/\b2026\s+to\s+27\b/gi, '2026-27')
}
