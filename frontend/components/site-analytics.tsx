'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { shouldExcludeAnalytics } from '@/lib/ga-exclude'

/** Vercel Analytics — same exclusions as GA4. */
export function SiteAnalytics() {
  const pathname = usePathname()
  const { status, isStaff } = useAuth()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    setAllowed(!shouldExcludeAnalytics({ isStaff, pathname: pathname || '/' }))
  }, [status, isStaff, pathname])

  if (!allowed) return null
  return <Analytics />
}
