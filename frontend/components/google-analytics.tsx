'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useAuth } from '@/lib/hooks/use-auth'
import { shouldExcludeAnalytics } from '@/lib/ga-exclude'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()

/**
 * Google Analytics 4 — skips owner browsers, opt-out, localhost/previews,
 * and automation (Cursor agents). Other staff still count.
 */
export function GoogleAnalytics() {
  const { status, member, personalEmail, viewingEmail } = useAuth()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!GA_ID) {
      setAllowed(false)
      return
    }
    // Wait for auth so owner sessions never fire a first page_view.
    if (status === 'loading') return
    setAllowed(
      !shouldExcludeAnalytics({
        emails: [member?.email, personalEmail, viewingEmail],
      }),
    )
  }, [status, member?.email, personalEmail, viewingEmail])

  if (!GA_ID || !allowed) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
