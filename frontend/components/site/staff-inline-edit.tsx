'use client'

import { InlineCopyShell } from '@/components/cms/inline-copy-shell'

type Props = {
  children: React.ReactNode
}

/** Admin live copy editing on staff portal (shell + home strings). Layout composer stays off. */
export function StaffInlineEdit({ children }: Props) {
  return <InlineCopyShell pageSlug="staff-portal">{children}</InlineCopyShell>
}
