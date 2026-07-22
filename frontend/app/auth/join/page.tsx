'use client'

/**
 * /auth/join — Sign Up–first parent account gate.
 * Wix’s hosted MemberLoginDialog always opens in Log In mode, so pricing CTAs
 * land here first. Email sign-up/login is owned on this page; social providers
 * still use Wix OAuth (provider screens), not the Log In–first modal copy.
 */
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createVisitorClient } from '@/lib/wix-oauth-client'
import { LoginState } from '@wix/sdk'

type Mode = 'signup' | 'login'
type Panel = 'chooser' | 'email'

function safeReturnTo(raw: string | null): string {
  const value = (raw || '/member-portal').trim()
  if (!value.startsWith('/') || value.startsWith('//')) return '/member-portal'
  return value
}

function JoinInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const returnTo = useMemo(
    () => safeReturnTo(searchParams.get('returnTo')),
    [searchParams],
  )
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [panel, setPanel] = useState<Panel>('chooser')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  function switchMode(next: Mode) {
    setMode(next)
    setPanel('chooser')
    setNeedsVerify(false)
    setError(null)
    const qs = new URLSearchParams({ returnTo })
    if (next === 'login') qs.set('mode', 'login')
    router.replace(`/auth/join?${qs.toString()}`)
  }

  async function completeWithSessionToken(sessionToken: string) {
    const res = await fetch('/api/auth/complete-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, returnTo }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      authUrl?: string
      error?: string
    }
    if (!res.ok || !data.authUrl) {
      throw new Error(data.error || 'Could not finish sign-in')
    }
    window.location.href = data.authUrl
  }

  function startWixProviders() {
    window.location.href = `/api/auth/wix-login?returnTo=${encodeURIComponent(returnTo)}`
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const client = createVisitorClient()
      const visitorTokens = await client.auth.generateVisitorTokens()
      client.auth.setTokens(visitorTokens)

      if (needsVerify) {
        const verified = await client.auth.processVerification({
          verificationCode: verifyCode.trim(),
        })
        if (verified.loginState !== LoginState.SUCCESS || !verified.data?.sessionToken) {
          throw new Error('Verification failed. Check the code and try again.')
        }
        await completeWithSessionToken(verified.data.sessionToken)
        return
      }

      const result =
        mode === 'signup'
          ? await client.auth.register({ email: email.trim(), password })
          : await client.auth.login({ email: email.trim(), password })

      if (result.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
        setNeedsVerify(true)
        setError('Check your email for a verification code, then enter it below.')
        return
      }
      if (result.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
        throw new Error('Your account is waiting for PTO approval. Email membership@shmspto.org.')
      }
      if (result.loginState !== LoginState.SUCCESS || !('data' in result) || !result.data?.sessionToken) {
        const fail = result as { error?: string; errorCode?: string }
        if (fail.errorCode === 'emailAlreadyExists') {
          switchMode('login')
          throw new Error('That email already has an account. Log in below.')
        }
        throw new Error(fail.error || (mode === 'signup' ? 'Could not create account' : 'Could not log in'))
      }
      await completeWithSessionToken(result.data.sessionToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const isSignup = mode === 'signup'
  const primaryBtn =
    'w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E4DC] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#085508' }}>
          SHMS PTO
        </p>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">
          {isSignup ? 'Create Your Account' : 'Log In'}
        </h1>
        <p className="text-sm text-[#5A6070] mb-6">
          {isSignup
            ? 'Sign up free, then finish joining your membership tier.'
            : 'Welcome back. Continue to membership or your portal.'}
        </p>

        {panel === 'chooser' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startWixProviders}
              className={primaryBtn}
              style={{ backgroundColor: '#085508' }}
            >
              {isSignup ? 'Sign up with Google' : 'Log in with Google'}
            </button>
            <button
              type="button"
              onClick={startWixProviders}
              className={primaryBtn}
              style={{ backgroundColor: '#085508' }}
            >
              {isSignup ? 'Sign up with Facebook' : 'Log in with Facebook'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel('email')
                setError(null)
              }}
              className={primaryBtn}
              style={{ backgroundColor: '#085508' }}
            >
              {isSignup ? 'Sign up with Email' : 'Log in with Email'}
            </button>
            <p className="text-xs text-[#5A6070] text-center pt-1">
              Google and Facebook open secure provider sign-in. Email stays on this page.
            </p>
          </div>
        ) : (
          <form onSubmit={onEmailSubmit} className="space-y-3">
            <button
              type="button"
              className="text-xs font-semibold underline mb-1"
              style={{ color: '#085508' }}
              onClick={() => {
                setPanel('chooser')
                setNeedsVerify(false)
                setError(null)
              }}
            >
              ← Back to options
            </button>
            {!needsVerify ? (
              <>
                <label className="block text-sm">
                  <span className="font-semibold text-[#1A1A1A]">Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-[#1A1A1A]">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            ) : (
              <label className="block text-sm">
                <span className="font-semibold text-[#1A1A1A]">Verification code</span>
                <input
                  type="text"
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
                />
              </label>
            )}

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className={primaryBtn}
              style={{ backgroundColor: '#085508' }}
            >
              {busy
                ? 'Please wait…'
                : needsVerify
                  ? 'Verify and continue'
                  : isSignup
                    ? 'Sign up with Email'
                    : 'Log in with Email'}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-center text-[#5A6070]">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: '#085508' }}
                onClick={() => switchMode('login')}
              >
                Log In
              </button>
            </>
          ) : (
            <>
              New to this site?{' '}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: '#085508' }}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
          <p className="text-sm text-[#5A6070]">Loading…</p>
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  )
}
