/** Client-safe program UI string helpers (no CMS/db imports). */

import { pickString } from '@/lib/api/page-strings-shared'
import { PROGRAM_UI_DEFAULTS } from '@/lib/defaults/program-ui-defaults'

export function programUiString(
  copy: Record<string, string>,
  key: string,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const template = pickString(copy, key, PROGRAM_UI_DEFAULTS[key] ?? key)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name]
    return v == null || v === '' ? '' : String(v)
  })
}
