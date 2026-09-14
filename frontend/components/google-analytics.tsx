'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useAuth } from '@/lib/hooks/use-auth'
import { gaUserIdFromMemberId, setGaUserId } from '@/lib/ga'
import { shouldExcludeAnalytics } from '@/lib/ga-exclude'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()

/**
 * Google Analytics 4. skips owner browsers, opt-out, localhost/previews,
 * and automation (Cursor agents). Other staff still count.
 * Logged-in members get a hashed non-PII user_id for returning-parent reports.
 */
export function GoogleAnalytics() {
  const { status, member, personalEmail, viewingEmail } = useAuth()
  const [allowed, setAllowed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!GA_ID) {
      setAllowed(false)
      setUserId(null)
      return
    }
    // Wait for auth so owner sessions never fire a first page_view.
    if (status === 'loading') return

    let cancelled = false
    ;(async () => {
      const exclude = shouldExcludeAnalytics({
        emails: [member?.email, personalEmail, viewingEmail],
      })
      if (exclude) {
        if (!cancelled) {
          setAllowed(false)
          setUserId(null)
        }
        return
      }

      let uid: string | null = null
      if (status === 'member' && member?.id) {
        uid = await gaUserIdFromMemberId(member.id)
      }
      if (cancelled) return
      setUserId(uid)
      setAllowed(true)
    })()

    return () => {
      cancelled = true
    }
  }, [status, member?.id, member?.email, personalEmail, viewingEmail])

  // Keep gtag user_id in sync after scripts load (login/logout without remount).
  useEffect(() => {
    if (!allowed || !GA_ID) return
    setGaUserId(status === 'member' ? userId : null)
  }, [allowed, status, userId])

  if (!GA_ID || !allowed) return null

  const configArg = userId
    ? `{ user_id: ${JSON.stringify(userId)} }`
    : ''

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
gtag('config', '${GA_ID}'${configArg ? `, ${configArg}` : ''});
        `}
      </Script>
    </>
  )
}
