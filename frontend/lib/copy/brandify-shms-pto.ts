/**
 * Always keep "PTO" after bare "SHMS" in public/marketing copy.
 * Safe to re-run. Leaves discount codes, emails, and domains alone.
 */
export function brandifyShmsPto(input: string): string {
  if (typeof input !== 'string' || !input) return input
  let s = input

  const protectedChunks: string[] = []
  const protect = (re: RegExp) => {
    s = s.replace(re, (m) => {
      protectedChunks.push(m)
      return `«P${protectedChunks.length - 1}»`
    })
  }

  protect(/shmspto\.org/gi)
  protect(/@shmspto\b/gi)
  protect(/SHMSREEF\d+/g)
  protect(/SHMSLAGOON\d+/g)
  protect(/SHMSTIDE\d+/g)
  protect(/SHMSCOVE(?::\d+)?/gi)
  protect(/pass\.org\.shmspto\b/gi)
  protect(/\/shms-[a-z0-9._-]+/gi)
  protect(/shms-logo/gi)

  s = s
    .replace(/\s*[·•|]\s*LCPS\b/gi, '')
    .replace(/\bLCPS\b/gi, '')
    .replace(/\bSHMS\b(?!\s+PTO)/g, 'SHMS PTO')
    .replace(/SHMS PTO PTO/g, 'SHMS PTO')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()

  return s.replace(/«P(\d+)»/g, (_, i) => protectedChunks[Number(i)] ?? '')
}
