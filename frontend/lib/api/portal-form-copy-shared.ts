/** Client-safe portal form string helpers (no CMS/db imports). */

import { pickString } from '@/lib/api/page-strings-shared'
import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'

export function formCopy(
  copy: Record<string, string>,
  key: keyof typeof PORTAL_FORM_DEFAULTS | string,
  fallback?: string,
): string {
  return pickString(copy, key, fallback ?? PORTAL_FORM_DEFAULTS[key] ?? '')
}

/** Replace {name} style tokens in CMS strings. */
export function interpolateCopy(template: string, vars: Record<string, string | number>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v))
  }
  return out
}
