'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { StaffWorkspace } from '@/lib/audience'
import { isPublicDemoInstance } from '@/lib/demo/instance'

type SurfaceState = {
  enabled: boolean
  liveCommerce: boolean
  loading: boolean
  note: string
  hiddenStaffWorkspaces: StaffWorkspace[]
}

const DEFAULT: SurfaceState = {
  enabled: false,
  liveCommerce: true,
  loading: false,
  note: '',
  hiddenStaffWorkspaces: [],
}

const CommonsSurfaceContext = createContext<SurfaceState>(DEFAULT)

export function CommonsSurfaceProvider({
  children,
  enabled,
}: {
  children: ReactNode
  enabled: boolean
}) {
  const [state, setState] = useState<Omit<SurfaceState, 'enabled'>>(() =>
    enabled
      ? {
          liveCommerce: isPublicDemoInstance() ? false : true,
          loading: true,
          note: isPublicDemoInstance()
            ? 'Sample school.\nLive checkout and card loads stay off here.'
            : '',
          hiddenStaffWorkspaces: [],
        }
      : {
          liveCommerce: true,
          loading: false,
          note: '',
          hiddenStaffWorkspaces: [],
        },
  )

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/commons/surface')
      .then(async (r) => {
        const d = (await r.json()) as {
          liveCommerce?: boolean
          note?: string
          hiddenStaffWorkspaces?: StaffWorkspace[]
        }
        if (cancelled) return
        setState({
          liveCommerce: Boolean(d.liveCommerce),
          loading: false,
          note: d.note || '',
          hiddenStaffWorkspaces: Array.isArray(d.hiddenStaffWorkspaces)
            ? d.hiddenStaffWorkspaces
            : [],
        })
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, liveCommerce: isPublicDemoInstance() ? false : s.liveCommerce }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const value = useMemo(() => ({ enabled, ...state }), [enabled, state])

  return (
    <CommonsSurfaceContext.Provider value={value}>{children}</CommonsSurfaceContext.Provider>
  )
}

export function useLiveCommerceGate(): {
  allowed: boolean
  loading: boolean
  note: string
  hiddenStaffWorkspaces: StaffWorkspace[]
} {
  const ctx = useContext(CommonsSurfaceContext)
  if (!ctx.enabled) {
    return { allowed: true, loading: false, note: '', hiddenStaffWorkspaces: [] }
  }
  return {
    allowed: ctx.liveCommerce,
    loading: ctx.loading,
    note: ctx.note,
    hiddenStaffWorkspaces: ctx.hiddenStaffWorkspaces,
  }
}
