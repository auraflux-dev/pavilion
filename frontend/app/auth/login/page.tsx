'use client'

/**
 * /auth/login — initiates the Wix OAuth login flow.
 * Generates PKCE OAuth data, stores it in a cookie, then redirects
 * the user to the Wix-managed login page.
 *
 * useSearchParams() must be inside a Suspense boundary in Next.js 14+.
 */
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createVisitorClient, getCallbackUrl } from '@/lib/wix-oauth-client'
import { OAUTH_DATA_COOKIE } from '@/lib/auth-cookies'
import Cookies from 'js-cookie'

function LoginInner() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/member-portal'

  useEffect(() => {
    async function startLogin() {
      try {
        const client = createVisitorClient()
        const callbackUrl = getCallbackUrl()

        const oAuthData = client.auth.generateOAuthData(
          callbackUrl,
          `${window.location.origin}${returnTo}`
        )

        Cookies.set(OAUTH_DATA_COOKIE, JSON.stringify(oAuthData), {
          expires: 1 / 24, // 1 hour
          sameSite: 'lax',
        })

        const { authUrl } = await client.auth.getAuthUrl(oAuthData)
        window.location.href = authUrl
      } catch (err) {
        console.error('Login initiation failed:', err)
        window.location.href = '/'
      }
    }

    startLogin()
  }, [returnTo])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: '#085508', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-[#5A6070]">Redirecting to login…</p>
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
