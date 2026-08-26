'use client'

import { createContext, useContext } from 'react'
import { PROGRAM_UI_DEFAULTS } from '@/lib/defaults/program-ui-defaults'
import { programUiString } from '@/lib/api/program-ui-copy'
import { CmsString } from '@/components/cms/cms-string'
import type { ComponentProps } from 'react'

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

type CmsProgramProps = Omit<ComponentProps<typeof CmsString>, 'page' | 'copy'>

/** Program UI string: Staff → program-strings + admin inline edit (same key). */
export function CmsProgram({ k, ...rest }: CmsProgramProps & { k: string }) {
  const copy = useProgramUiCopy()
  return <CmsString page="program-strings" k={k} copy={copy} {...rest} />
}
