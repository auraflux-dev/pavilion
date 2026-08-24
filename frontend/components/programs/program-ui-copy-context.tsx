'use client'

import { createContext, useContext } from 'react'
import { PROGRAM_UI_DEFAULTS } from '@/lib/defaults/program-ui-defaults'
import { programUiString } from '@/lib/api/program-ui-copy'

const ProgramUiCopyContext = createContext<Record<string, string>>(PROGRAM_UI_DEFAULTS)

export function ProgramUiCopyProvider({
  copy,
  children,
}: {
  copy: Record<string, string>
  children: React.ReactNode
}) {
  return (
    <ProgramUiCopyContext.Provider value={copy}>{children}</ProgramUiCopyContext.Provider>
  )
}

export function useProgramUiCopy() {
  return useContext(ProgramUiCopyContext)
}

export function ui(
  copy: Record<string, string>,
  key: string,
  vars?: Record<string, string | number | undefined | null>,
): string {
  return programUiString(copy, key, vars)
}

export function useProgramUi(key: string, vars?: Record<string, string | number | undefined | null>) {
  const copy = useProgramUiCopy()
  return programUiString(copy, key, vars)
}
