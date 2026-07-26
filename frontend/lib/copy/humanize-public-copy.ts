import { brandifyCoveDigitalCard } from '@/lib/copy/brandify-cove-digital-card'

/**
 * Public marketing copy: prefer plain sentences over em/en dashes,
 * and keep the Cove Digital Card product name consistent.
 */
export function humanizePublicCopy(text: string): string {
  if (!text) return text
  return brandifyCoveDigitalCard(
    text
      .replace(/\$(\d+(?:\.\d+)?)\s*[–—-]\s*\$(\d+(?:\.\d+)?)/g, '$$$1 to $$$2')
      .replace(/(\d+)\s*[–—-]\s*(\d+)(\s*(?:hours?|hrs|days?|weeks?|months?))/gi, '$1 to $2$3')
      .replace(/\s+[—]\s+/g, '. ')
      .replace(/\.\s+([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`)
      .replace(/\s{2,}/g, ' ')
      .trim(),
  )
}
