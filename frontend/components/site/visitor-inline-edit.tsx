'use client'

import { InlineCopyShell } from '@/components/cms/inline-copy-shell'

type Props = {
  children: React.ReactNode
}

/** Client wrapper for admin inline copy editing on public pages. */
export function VisitorInlineEdit({ children }: Props) {
  return <InlineCopyShell>{children}</InlineCopyShell>
}
