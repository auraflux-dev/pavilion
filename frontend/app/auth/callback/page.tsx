'use client'

/**
 * /auth/callback. handles the redirect back from Wix login.
 * Exchanges the authorization code for member tokens, stores them
 * in a secure httpOnly cookie via the API route, then redirects home.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVisitorClient } from '@/lib/wix-oauth-client'
import { OAUTH_DATA_COOKIE } from '@/lib/auth-cookies'
import Cookies from 'js-cookie'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        const client = createVisitorClient()

        // Wix success returns code in the hash; some failures use query (?error=)
        const query = new URLSearchParams(window.location.search)
        const queryError = query.get('error')
        if (queryError) {
          throw new Error(
            query.get('error_description') ||
              (queryError === 'unknown_error'
                ? 'Wix login could not start. Please try again (hard refresh if it keeps failing).'
                : queryError)
          )
        }

        // Parse code + state from URL hash/params
        const returnedOAuthData = client.auth.parseFromUrl()
        if ('error' in returnedOAuthData && returnedOAuthData.error) {
          throw new Error(returnedOAuthData.errorDescription ?? 'Login failed')
        }

        // Retrieve stored OAuth data (PKCE verifier)
        const storedRaw = Cookies.get(OAUTH_DATA_COOKIE)
        if (!storedRaw) throw new Error('OAuth session expired. Please try again.')
        const oAuthData = JSON.parse(storedRaw)
        Cookies.remove(OAUTH_DATA_COOKIE)

        // Exchange code for member tokens
        const tokens = await client.auth.getMemberTokens(
          (returnedOAuthData as { code: string; state: string }).code,
          (returnedOAuthData as { code: string; state: string }).state,
          oAuthData
        )

        // Store tokens via server-side API route (sets httpOnly cookie)
        const res = await fetch('/api/auth/set-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens }),
        })

        if (!res.ok) throw new Error('Failed to save session')

        // Redirect to original destination (keep query. e.g. ?checkout=ruby)
        let returnTo = '/member-portal'
        if (oAuthData.originalUri) {
          try {
            const dest = new URL(oAuthData.originalUri)
            returnTo = `${dest.pathname}${dest.search}`
          } catch {
            returnTo = '/member-portal'
          }
        }
        router.replace(returnTo)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication failed'
        setError(msg)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm">
          <p className="text-[#085508] font-bold mb-2">Login failed</p>
          <p className="text-sm text-[#5A6070] mb-6">{error}</p>
          <a
            href="/api/auth/wix-login?returnTo=/member-portal"
            className="text-sm font-semibold underline"
            style={{ color: '#085508' }}
          >
            Try again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: '#085508', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-[#5A6070]">Completing login…</p>
      </div>
    </div>
  )
}
