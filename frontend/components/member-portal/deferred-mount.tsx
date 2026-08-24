'use client'

import { useEffect, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Wait until main portal shell has painted. */
  delayMs?: number
}

/** Mount children after first paint so above-the-fold portal data loads first. */
export function DeferredMount({ children, delayMs = 0 }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (!cancelled) setReady(true)
    }
    let idleHandle: number | ReturnType<typeof setTimeout> | undefined
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(start, { timeout: 1200 })
    } else {
      idleHandle = globalThis.setTimeout(start, Math.max(delayMs, 250))
    }

    return () => {
      cancelled = true
      if (idleHandle == null) return
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleHandle === 'number') {
        window.cancelIdleCallback(idleHandle)
      } else {
        clearTimeout(idleHandle as ReturnType<typeof setTimeout>)
      }
    }
  }, [delayMs])

  if (!ready) return null
  return <>{children}</>
}
