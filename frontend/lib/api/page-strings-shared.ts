/** Client-safe page string helpers (no CMS/db imports). */

export function pickString(
  map: Record<string, string>,
  key: string,
  fallback: string,
): string {
  const value = map[key]?.trim()
  return value || fallback
}
