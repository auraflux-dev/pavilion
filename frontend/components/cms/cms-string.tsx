'use client'

import { formString } from '@/lib/copy/form-string'
import { SITE_STRING_DEFAULTS } from '@/lib/defaults/site-string-defaults'
import { useCmsBundle } from '@/components/cms/cms-copy-provider'
import { EditableCopy } from '@/components/cms/editable-copy'

type Props = {
  /** PageContent.page (Staff → Page CSS & strings). */
  page: string
  /** stringOverrides key. */
  k: string
  fallback?: string
  /** Optional pre-merged copy (portal provider, form props). */
  copy?: Record<string, string>
  vars?: Record<string, string | number | undefined | null>
  className?: string
  inlineTarget?: boolean
}

/**
 * One CMS string: Staff edits in Page CSS & strings; admins inline-edit the same key.
 */
export function CmsString({ page, k, fallback, copy, vars, className, inlineTarget }: Props) {
  const bundle = useCmsBundle(page)
  const merged = { ...(SITE_STRING_DEFAULTS[page] ?? {}), ...bundle, ...copy }
  const value = formString(merged, k, fallback ?? k, vars)
  return (
    <EditableCopy
      target={{ type: 'stringOverride', page, key: k }}
      value={value}
      className={className}
      inlineTarget={inlineTarget}
    />
  )
}
