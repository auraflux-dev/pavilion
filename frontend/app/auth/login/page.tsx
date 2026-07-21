'use client'

/**
 * /auth/login — hands off to /api/auth/wix-login for a single server-side
 * authorize URL (avoids Strict Mode double-start + stale cookie races).
 */
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginInner() {
  const searchParams = useSearchParams()
  const rawReturn = searchParams.get('returnTo') ?? '/member-portal'
  const returnTo = rawReturn.startsWith('/') ? rawReturn : `/${rawReturn}`

  useEffect(() => {
    const url = `/api/auth/wix-login?returnTo=${encodeURIComponent(returnTo)}`
    window.location.replace(url)
  }, [returnTo])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="text-center max-w-sm">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: '#085508', borderTopColor: 'transparent' }}
        />
        <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Taking you to secure login</p>
        <p className="text-sm text-[#5A6070]">
          New here? Choose Sign Up on the next screen to create a free parent account.
          Already a member? Log in with email or Google.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4"
              style={{ borderColor: '#085508', borderTopColor: 'transparent' }}
            />
            <p className="text-sm text-[#5A6070]">Loading…</p>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
