'use client'

import { InlineCopyShell } from '@/components/cms/inline-copy-shell'

/** Enables admin inline copy + live page layout editing on the public site. */
export function VisitorInlineEdit({
  pageSlug = 'home',
  children,
}: {
  pageSlug?: string
  children: React.ReactNode
}) {
  return <InlineCopyShell pageSlug={pageSlug}>{children}</InlineCopyShell>
}
