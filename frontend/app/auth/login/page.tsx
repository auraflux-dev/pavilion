'use client'

/**
 * /auth/login. send existing “log in” links to /auth/join.
 * Pricing / Join CTAs use signup mode by default; explicit login keeps mode=login.
 */
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginInner() {
  const searchParams = useSearchParams()
  const rawReturn = searchParams.get('returnTo') ?? '/member-portal'
  const returnTo = rawReturn.startsWith('/') ? rawReturn : `/${rawReturn}`
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  useEffect(() => {
    const qs = new URLSearchParams({ returnTo })
    if (mode === 'login') qs.set('mode', 'login')
    window.location.replace(`/auth/join?${qs.toString()}`)
  }, [returnTo, mode])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--brand-warm)' }}>
      <div className="text-center max-w-sm">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--brand-green)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
          {mode === 'signup' ? 'Taking you to create your account' : 'Taking you to log in'}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <p className="text-sm text-[#5A6070]">Loading…</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
