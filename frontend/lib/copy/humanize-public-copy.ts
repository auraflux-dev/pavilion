import { brandifyCoveDigitalCard } from '@/lib/copy/brandify-cove-digital-card'

/**
 * Public marketing copy: prefer plain sentences over em/en dashes,
 * and keep the Cove Digital Card product name consistent.
 *
 * Em/en dashes as punctuation are a known AI-writing tell. Always strip them
 * from visitor-facing CMS text (see mem:frontend/copy-voice).
 */
export function humanizePublicCopy(text: string): string {
  if (!text) return text
  let s = text
    // money / time / numeric ranges
    .replace(/\$(\d+(?:\.\d+)?)\s*[–—-]\s*\$(\d+(?:\.\d+)?)/g, '$$$1 to $$$2')
    .replace(/(\d{1,2}:\d{2})\s*[–—]\s*(\d{1,2}:\d{2})/g, '$1 to $2')
    .replace(/(\d+)\s*[–—-]\s*(\d+)(\s*(?:hours?|hrs|days?|weeks?|months?|%))?/gi, '$1 to $2$3')
    // clause separators
    .replace(/\s+[—–]\s+/g, '. ')
    // leading signature dashes
    .replace(/(^|\n)\s*—\s+/g, '$1')
    // compound en dash
    .replace(/(\w)–(\w)/g, '$1-$2')
    // any leftovers
    .replace(/—/g, '. ')
    .replace(/–/g, ' to ')
    .replace(/\.\s+\./g, '.')
    .replace(/\.\s+([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`)
    .replace(/\s{2,}/g, ' ')
    .trim()

  return brandifyCoveDigitalCard(s)
}
