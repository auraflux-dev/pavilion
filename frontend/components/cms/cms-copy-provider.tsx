'use client'

import { createContext, useContext } from 'react'

export type CmsCopyBundles = Record<string, Record<string, string>>

const CmsCopyContext = createContext<CmsCopyBundles>({})

export function CmsCopyProvider({
  bundles,
  children,
}: {
  bundles: CmsCopyBundles
  children: React.ReactNode
}) {
  return <CmsCopyContext.Provider value={bundles}>{children}</CmsCopyContext.Provider>
}

export function useCmsBundles(): CmsCopyBundles {
  return useContext(CmsCopyContext)
}

export function useCmsBundle(page: string): Record<string, string> {
  return useContext(CmsCopyContext)[page] ?? {}
}
