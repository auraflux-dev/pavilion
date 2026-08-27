'use client'

import { createContext, useContext } from 'react'
import { formCopy } from '@/lib/api/portal-form-copy-shared'
import { PORTAL_FORM_DEFAULTS } from '@/lib/defaults/portal-form-defaults'
import { CmsString } from '@/components/cms/cms-string'
import type { ComponentProps } from 'react'

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

type CmsPortalProps = Omit<ComponentProps<typeof CmsString>, 'page' | 'copy'>

/** Portal form string: Staff → portal-forms + admin inline edit (same key). */
export function CmsPortal({ k, ...rest }: CmsPortalProps & { k: string }) {
  const copy = usePortalFormCopy()
  return <CmsString page="portal-forms" k={k} copy={copy} {...rest} />
}
