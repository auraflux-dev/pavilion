import { getPageStrings, pickString } from '@/lib/api/page-strings'
import { PROGRAM_UI_DEFAULTS } from '@/lib/defaults/program-ui-defaults'

export async function getProgramUiCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('program-strings')
  return { ...PROGRAM_UI_DEFAULTS, ...cms }
}

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
