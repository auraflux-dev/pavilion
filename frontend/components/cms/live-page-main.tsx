'use client'

import type { ReactNode } from 'react'
import { useLiveEditor } from '@/components/cms/live-editor-context'
import { LiveSectionCanvas } from '@/components/cms/live-section-canvas'

/** Swap server children for the live section canvas when layout edit is on. */
export function LivePageMain({ children }: { children: ReactNode }) {
  const { layoutEditMode, canLayoutEdit } = useLiveEditor()
  if (canLayoutEdit && layoutEditMode) return <LiveSectionCanvas />
  return <>{children}</>
}
