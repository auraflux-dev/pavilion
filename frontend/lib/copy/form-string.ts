/** Client-safe string picker for form copy maps. */

export function formString(
  copy: Record<string, string>,
  key: string,
  fallback = key,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const value = copy[key]?.trim()
  const template = value || fallback
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name]
    return v == null || v === '' ? '' : String(v)
  })
}
