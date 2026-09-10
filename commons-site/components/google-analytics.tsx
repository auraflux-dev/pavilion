'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()

/**
 * GA4 for Pavilion marketing (onpavilion.com).
 * Skips localhost, Vercel previews, and ?ga_opt_out=1 / localStorage opt-out.
 */
export function GoogleAnalytics() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!GA_ID) {
      setAllowed(false)
      return
    }
    try {
      const host = window.location.hostname
      if (host === 'localhost' || host.endsWith('.vercel.app')) {
        setAllowed(false)
        return
      }
      if (window.localStorage.getItem('pavilion_ga_opt_out') === '1') {
        setAllowed(false)
        return
      }
      const params = new URLSearchParams(window.location.search)
      if (params.get('ga_opt_out') === '1') {
        window.localStorage.setItem('pavilion_ga_opt_out', '1')
        setAllowed(false)
        return
      }
    } catch {
      setAllowed(false)
      return
    }
    setAllowed(true)
  }, [])

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
