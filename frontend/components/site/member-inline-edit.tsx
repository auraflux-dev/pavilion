'use client'

import { InlineCopyShell } from '@/components/cms/inline-copy-shell'

type Props = {
  children: React.ReactNode
  pageSlug?: string
}

/** Client wrapper for admin live copy editing on member portal pages. */
export function MemberInlineEdit({ children, pageSlug = 'member-portal' }: Props) {
  return <InlineCopyShell pageSlug={pageSlug}>{children}</InlineCopyShell>
}
