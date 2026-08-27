import 'server-only'

import { getPageStrings } from '@/lib/api/page-strings'
import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'

export type PortalFormCopy = typeof PORTAL_FORM_DEFAULTS

export { formCopy, interpolateCopy } from '@/lib/api/portal-form-copy-shared'

export async function getPortalFormCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('portal-forms')
  return { ...PORTAL_FORM_DEFAULTS, ...cms }
}
