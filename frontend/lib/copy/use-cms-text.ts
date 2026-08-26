'use client'

import { formString } from '@/lib/copy/form-string'
import { SITE_STRING_DEFAULTS } from '@/lib/defaults/site-string-defaults'
import { useCmsBundle } from '@/components/cms/cms-copy-provider'

/** Resolve CMS string (same keys as Staff → Page CSS & strings). Plain text for attrs. */
export function useCmsText(
  page: string,
  k: string,
  fallback?: string,
  opts?: {
    copy?: Record<string, string>
    vars?: Record<string, string | number | undefined | null>
  },
): string {
  const bundle = useCmsBundle(page)
  const merged = { ...(SITE_STRING_DEFAULTS[page] ?? {}), ...bundle, ...opts?.copy }
  return formString(merged, k, fallback ?? k, opts?.vars)
}
