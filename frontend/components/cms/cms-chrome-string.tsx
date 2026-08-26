'use client'

import { CmsString } from '@/components/cms/cms-string'
import { SITE_CHROME_DEFAULTS } from '@/lib/defaults/visitor-string-defaults'
import { formString } from '@/lib/copy/form-string'

type Props = {
  k: string
  fallback?: string
  className?: string
  inlineTarget?: boolean
  vars?: Record<string, string | number | undefined | null>
}

/** Global nav/footer string: Staff → site-chrome + inline edit. */
export function ChromeString({ k, fallback, className, inlineTarget, vars }: Props) {
  const fb = fallback ?? formString(SITE_CHROME_DEFAULTS, k, k, vars)
  return (
    <CmsString
      page="site-chrome"
      k={k}
      fallback={fb}
      className={className}
      inlineTarget={inlineTarget}
      vars={vars}
    />
  )
}
