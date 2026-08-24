'use client'

import { createContext, useContext } from 'react'
import { formCopy } from '@/lib/api/portal-form-copy'
import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'

const PortalFormCopyContext = createContext<Record<string, string>>(PORTAL_FORM_DEFAULTS)

export function PortalFormCopyProvider({
  value,
  children,
}: {
  value?: Record<string, string>
  children: React.ReactNode
}) {
  const merged = { ...PORTAL_FORM_DEFAULTS, ...value }
  return (
    <PortalFormCopyContext.Provider value={merged}>{children}</PortalFormCopyContext.Provider>
  )
}

export function usePortalFormCopy(): Record<string, string> {
  return useContext(PortalFormCopyContext)
}

export function useFormString(key: string, fallback?: string): string {
  return formCopy(usePortalFormCopy(), key, fallback)
}
