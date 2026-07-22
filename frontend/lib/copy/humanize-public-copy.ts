/**
 * Public marketing copy: prefer plain sentences over em/en dashes.
 * Sapling does not flag em dashes; parents still read them as “hyphens.”
 */
export function humanizePublicCopy(text: string): string {
  if (!text) return text
  return text
    .replace(/\$(\d+(?:\.\d+)?)\s*[–—-]\s*\$(\d+(?:\.\d+)?)/g, '$$$1 to $$$2')
    .replace(/(\d+)\s*[–—-]\s*(\d+)(\s*(?:hours?|hrs|days?|weeks?|months?))/gi, '$1 to $2$3')
    .replace(/\s+[—]\s+/g, '. ')
    .replace(/\.\s+([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`)
    .replace(/\s{2,}/g, ' ')
    .trim()
}
