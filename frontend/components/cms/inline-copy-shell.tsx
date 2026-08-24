'use client'

import { InlineCopyProvider } from '@/components/cms/inline-copy-context'
import { InlineCopyToolbar } from '@/components/cms/inline-copy-toolbar'

/** Wrap visitor / portal chrome so admins can toggle inline CMS copy editing. */
export function InlineCopyShell({ children }: { children: React.ReactNode }) {
  return (
    <InlineCopyProvider>
      {children}
      <InlineCopyToolbar />
    </InlineCopyProvider>
  )
}
