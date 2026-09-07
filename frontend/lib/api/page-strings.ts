import 'server-only'

import { getPageContent } from '@/lib/api/page-content'
import { parseStringOverrides, mergeStringOverrides } from '@/lib/copy/string-overrides'
import { parseKeyedLines } from '@/lib/defaults/portal-copy'
import { SITE_STRING_DEFAULTS } from '@/lib/defaults/site-string-defaults'
import { isPavilionSurface, vanillaizeRecord } from '@/lib/demo/brand'

export { pickString } from '@/lib/api/page-strings-shared'

/** Granular copy for a PageContent row (stringOverrides + keyed bullets + code defaults). */
export async function getPageStrings(page: string): Promise<Record<string, string>> {
  const content = await getPageContent(page)
  const defaults = SITE_STRING_DEFAULTS[page] ?? {}
  const fromBullets = parseKeyedLines(content.bullets)
  const fromOverrides = parseStringOverrides(content.stringOverrides)
  const merged = mergeStringOverrides(mergeStringOverrides(defaults, fromBullets), fromOverrides)
  // Demo / Pavilion platform must never ship raw Stone Hill string defaults in RSC.
  return isPavilionSurface() ? vanillaizeRecord(merged) : merged
}
