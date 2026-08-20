'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { shouldExcludeAnalytics } from '@/lib/ga-exclude'

/** Sends an anonymous pageview so Monday’s activity email can include weekly traffic. */
export function TrafficBeacon() {
  const pathname = usePathname()
  const { status, member, personalEmail, viewingEmail } = useAuth()

  useEffect(() => {
    if (!pathname) return
    if (status === 'loading') return
    if (
      shouldExcludeAnalytics({
        emails: [member?.email, personalEmail, viewingEmail],
      })
    ) {
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
  }, [pathname, status, member?.email, personalEmail, viewingEmail])

  return null
}
