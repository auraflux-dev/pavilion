'use client'

import { CommonsSurfaceProvider } from '@/lib/demo/commons-surface-context'

export function CommonsSurfaceShell({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  return <CommonsSurfaceProvider enabled={enabled}>{children}</CommonsSurfaceProvider>
}
