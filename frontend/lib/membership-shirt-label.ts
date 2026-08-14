/** Pure helpers for membership Spirit Wear “Design · Size” labels (safe for client). */

export function parseMembershipShirtLabel(label: string): {
  design: string
  size: string
} {
  const parts = String(label || '')
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return {
      design: parts.slice(0, -1).join(' · '),
      size: parts[parts.length - 1]!,
    }
  }
  const size = parts[0] || String(label || '').trim()
  return { design: 'Standard', size: size || 'Unknown' }
}

export function formatMembershipShirtLabel(design: string, size: string): string {
  const d = design.trim() || 'Standard'
  const s = size.trim()
  if (!s) return d
  if (d.toLowerCase() === 'standard') return s
  return `${d} · ${s}`
}
