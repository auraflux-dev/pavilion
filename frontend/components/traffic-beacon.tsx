'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Sends an anonymous pageview so Monday’s activity email can include weekly traffic. */
export function TrafficBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      void fetch('/api/ops/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
        signal: ctrl.signal,
      }).catch(() => undefined)
    }, 400)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [pathname])

  return null
}
