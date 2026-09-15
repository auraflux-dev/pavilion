/**
 * Prefer the customer's real host for client Staff / member surfaces.
 */
export function clientStaffOrigin(opts: {
  customDomain?: string | null
  tempHost?: string | null
}): string | null {
  const custom = String(opts.customDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const temp = String(opts.tempHost || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const host = custom || temp
  if (!host) return null
  if (host.includes('localhost') || host.endsWith('.vercel.app')) {
    // Same deploy dogfood — stay relative
    return null
  }
  return `https://${host}`
}

export function clientStaffHandoffPath(organizationId: string, view = 'home'): string {
  const q = new URLSearchParams({ organizationId, view })
  return `/api/staff/platform/handoff?${q.toString()}`
}
