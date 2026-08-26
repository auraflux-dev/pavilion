'use client'

import { CmsString } from '@/components/cms/cms-string'

type BaseProps = {
  k: string
  fallback: string
  className?: string
  inlineTarget?: boolean
  vars?: Record<string, string | number | undefined | null>
}

export function CmsHub({ k, fallback, className, inlineTarget, vars }: BaseProps) {
  return (
    <CmsString
      page="portal-hub"
      k={k}
      fallback={fallback}
      className={className}
      inlineTarget={inlineTarget}
      vars={vars}
    />
  )
}

export function CmsNotice({
  k,
  fallback,
  copy,
  className,
  inlineTarget,
  vars,
}: BaseProps & { copy?: Record<string, string> }) {
  return (
    <CmsString
      page="portal-notices"
      k={k}
      fallback={fallback}
      copy={copy}
      className={className}
      inlineTarget={inlineTarget}
      vars={vars}
    />
  )
}
