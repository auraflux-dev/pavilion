/** Append staff signature to a plain-text email body (portal replies / blasts). */
export function applyEmailSignature(
  body: string,
  signature: string | undefined | null,
  includeSignature = true,
): string {
  const text = body.replace(/\s+$/g, '')
  const sig = String(signature ?? '').trim()
  if (!includeSignature || !sig) return text
  if (text.endsWith(sig)) return text
  return `${text}\n\n--\n${sig}`
}
