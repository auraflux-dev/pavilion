'use client'

import { InlineCopyProvider } from '@/components/cms/inline-copy-context'
import { LiveEditorProvider } from '@/components/cms/live-editor-context'
import { LiveEditorToolbar } from '@/components/cms/live-editor-toolbar'

/** Visitor/portal shell: inline copy + live page layout editor for admins. */
export function InlineCopyShell({
  pageSlug = 'home',
  children,
}: {
  pageSlug?: string
  children: React.ReactNode
}) {
  return (
    <InlineCopyProvider>
      <LiveEditorProvider pageSlug={pageSlug}>
        {children}
        <LiveEditorToolbar />
      </LiveEditorProvider>
    </InlineCopyProvider>
  )
}
