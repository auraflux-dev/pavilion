/**
 * Granular copy overrides stored on PageContent.stringOverrides (one key|text per line).
 * Same format as portal-hub bullets in lib/defaults/portal-copy.ts.
 */

export function parseStringOverrides(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of String(raw ?? '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const pipe = trimmed.indexOf('|')
    if (pipe <= 0) continue
    const key = trimmed.slice(0, pipe).trim()
    const text = trimmed.slice(pipe + 1).trim()
    if (key) out[key] = text
  }
  return out
}

export function mergeStringOverrides(
  defaults: Record<string, string>,
  overrides: Record<string, string>,
): Record<string, string> {
  const merged = { ...defaults }
  for (const [key, value] of Object.entries(overrides)) {
    if (value.trim()) merged[key] = value.trim()
  }
  return merged
}

export function formatStringOverrides(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}|${v}`)
    .join('\n')
}
