import { getPageStrings, pickString } from '@/lib/api/page-strings'
import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'

export type PortalFormCopy = typeof PORTAL_FORM_DEFAULTS

export async function getPortalFormCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('portal-forms')
  return { ...PORTAL_FORM_DEFAULTS, ...cms }
}

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
