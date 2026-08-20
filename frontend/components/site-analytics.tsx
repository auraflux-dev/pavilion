'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { useAuth } from '@/lib/hooks/use-auth'
import { shouldExcludeAnalytics } from '@/lib/ga-exclude'

/** Vercel Analytics — same exclusions as GA4 (owner / agents, not all staff). */
export function SiteAnalytics() {
  const { status, member, personalEmail, viewingEmail } = useAuth()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    setAllowed(
      !shouldExcludeAnalytics({
        emails: [member?.email, personalEmail, viewingEmail],
      }),
    )
  }, [status, member?.email, personalEmail, viewingEmail])

  if (!allowed) return null
  return <Analytics />
}
