import { getPageStrings } from '@/lib/api/page-strings'
import { PROGRAM_UI_DEFAULTS } from '@/lib/defaults/program-ui-defaults'

export { programUiString } from '@/lib/api/program-ui-copy-shared'

export async function getProgramUiCopy(): Promise<Record<string, string>> {
  const cms = await getPageStrings('program-strings')
  return { ...PROGRAM_UI_DEFAULTS, ...cms }
}
