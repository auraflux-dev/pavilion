/** Normalize parent-entered US phone numbers for Wix member contact.phones (string[]). */
export function normalizePortalPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
    return null
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export function formatPortalPhoneDisplay(raw: string): string {
  const normalized = normalizePortalPhone(raw)
  if (!normalized) return raw.trim()
  const digits = normalized.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4)
    const prefix = digits.slice(4, 7)
    const line = digits.slice(7)
    return `(${area}) ${prefix}-${line}`
  }
  return normalized
}
