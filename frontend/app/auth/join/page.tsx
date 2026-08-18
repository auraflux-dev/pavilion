'use client'

/**
 * /auth/join. Sign Up-first parent account gate.
 * Wix’s hosted MemberLoginDialog always opens in Log In mode, so pricing CTAs
 * land here first. Email sign-up/login is owned on this page; social providers
 * still use Wix OAuth (provider screens), not the Log In-first modal copy.
 */
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { clearPendingAuth, markPendingAuth, trackLogin, trackSignUp } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

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
  const [resetSent, setResetSent] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [verifyStateToken, setVerifyStateToken] = useState<string | null>(null)

  useEffect(() => {
    setMode(initialMode)
    setPanel('chooser')
    setResetSent(null)
  }, [initialMode])

  /** Show Google when enabled in env (OAuth client must be External, not Internal). */
  const googleParentEnabled =
    process.env.NEXT_PUBLIC_GOOGLE_PARENT_SIGNIN === 'true'

  useEffect(() => {
    const code = searchParams.get('error')
    if (!code) return
    const messages: Record<string, string> = {
      google_not_configured:
        'Google sign-in is not configured yet. Use your personal email and password for now.',
      google_denied: 'Google sign-in was cancelled. Try again or use email.',
      google_state_mismatch: 'Google sign-in expired. Please try again.',
      google_email_unverified:
        'That Google account email is not verified. Verify it with Google, or use email.',
      google_failed:
        'Google sign-in failed. Try again or use email and password.',
      google_org_internal:
        vanillaizeIfDemo(
          'Google still has this app set to Internal (org-only). PTO admin: set the OAuth client to External and rename it “SHMS PTO”. Meanwhile use email and password.',
        ),
    }
    setError(messages[code] || 'Sign-in failed. Try again or use email.')
  }, [searchParams])

  function switchMode(next: Mode, opts?: { keepEmailPanel?: boolean }) {
    setMode(next)
 // Stay on the email form when switching signup↔login from there.     // resetting to the chooser felt like getting kicked out mid-flow.
    if (!opts?.keepEmailPanel) setPanel('chooser')
    setNeedsVerify(false)
    setVerifyStateToken(null)
    setError(null)
    const qs = new URLSearchParams({ returnTo })
    if (next === 'login') qs.set('mode', 'login')
    router.replace(`/auth/join?${qs.toString()}`)
  }

  function startGoogle() {
    markPendingAuth('google', mode === 'signup' ? 'sign_up' : 'login')
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`
  }

  async function onForgotPassword() {
    setError(null)
    setResetSent(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email above, then tap Forgot password.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, returnTo }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Could not send reset email.')
      }
      setResetSent(
        data.message ||
          'If an account exists for that email, we sent a reset link. Check your inbox (and spam).',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setBusy(false)
    }
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          needsVerify
            ? {
                mode,
                email: email.trim(),
                password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                verificationCode: verifyCode.trim(),
                stateToken: verifyStateToken,
                returnTo,
              }
            : {
                mode,
                email: email.trim(),
                password,
                ...(mode === 'signup'
                  ? { firstName: firstName.trim(), lastName: lastName.trim() }
                  : {}),
                returnTo,
              },
        ),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        redirectTo?: string
        needsVerify?: boolean
        stateToken?: string
        message?: string
        error?: string
        errorCode?: string
      }

      if (data.needsVerify) {
        setNeedsVerify(true)
        if (data.stateToken) setVerifyStateToken(data.stateToken)
        setError(data.message || 'Check your email for a verification code, then enter it below.')
        return
      }

      if (!res.ok || !data.redirectTo) {
        if (data.errorCode === 'emailAlreadyExists') {
          switchMode('login', { keepEmailPanel: true })
          setPassword('')
          throw new Error(
            data.error || 'That email already has an account. Enter your password to log in.',
          )
        }
        if (data.errorCode === 'ownerApprovalRequired') {
          throw new Error(
            data.error ||
              'Your parent account is pending approval. Keep using your personal email. Staff (@shmspto.org) is only for board tools, not family portal login. Email vp-membershipexperience@shmspto.org if this continues.',
          )
        }
        if (data.errorCode === 'resetPassword') {
          throw new Error(
            data.error ||
              'Please reset your password (Forgot password below), then try again.',
          )
        }
        throw new Error(data.error || (mode === 'signup' ? 'Could not create account' : 'Could not log in'))
      }

      if (mode === 'signup') trackSignUp('email', 'website')
      else trackLogin('email', 'website')
      clearPendingAuth()
      window.location.href = data.redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const isSignup = mode === 'signup'
  const isStaffReturn =
    returnTo === '/staff' || returnTo.startsWith('/staff/') || returnTo.startsWith('/staff?')
  const primaryBtn =
    'w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E4DC] shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#085508' }}>
          {vanillaizeIfDemo('SHMS PTO')}
        </p>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">
          {isStaffReturn
            ? 'Staff Sign In'
            : isSignup
              ? 'Create Your Account'
              : 'Log In'}
        </h1>
        <p className="text-sm text-[#5A6070] mb-6">
          {isStaffReturn
            ? vanillaizeIfDemo(
                'Use your @shmspto.org Google account or email. Family Member Portal uses a personal email, not this staff path.',
              )
            : isSignup
              ? 'Sign up free with your personal email, then finish joining your membership tier.'
              : vanillaizeIfDemo(
                  'Parents: use your personal email (Gmail, etc.). @shmspto.org is for Staff tools only, not for Member Portal family login.',
                )}
        </p>

        {panel === 'chooser' ? (
          <div className="space-y-3">
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {googleParentEnabled ? (
              <button
                type="button"
                onClick={startGoogle}
                className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold border border-[#E8E4DC] text-[#1A1A1A] transition-opacity hover:opacity-90"
              >
                {isSignup ? 'Sign up with Google' : 'Log in with Google'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setPanel('email')
                setError(null)
                setResetSent(null)
              }}
              className={primaryBtn}
              style={{ backgroundColor: '#085508' }}
            >
              {isSignup ? 'Sign up with Email' : 'Log in with Email'}
            </button>
            {!googleParentEnabled ? (
              <p className="text-xs text-[#5A6070] text-center pt-1">
                Google sign-in is temporarily off. Use email and password, or email vp-membershipexperience@shmspto.org for help.
              </p>
            ) : null}
            {!isSignup && !isStaffReturn ? (
              <p className="text-xs text-[#5A6070] text-center pt-1">
                Board / staff (@shmspto.org)? Use{' '}
                <a href="/staff" className="font-semibold underline" style={{ color: '#085508' }}>
                  Staff tools
                </a>
                , not Member Portal.
              </p>
            ) : null}
            {isStaffReturn ? (
              <p className="text-xs text-[#5A6070] text-center pt-1">
                Looking for family portal?{' '}
                <a
                  href="/auth/join?mode=login&returnTo=%2Fmember-portal"
                  className="font-semibold underline"
                  style={{ color: '#085508' }}
                >
                  Member Portal login
                </a>
              </p>
            ) : null}
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
                setResetSent(null)
              }}
            >
              ← Back to options
            </button>
            {!needsVerify ? (
              <>
                {isSignup ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="font-semibold text-[#1A1A1A]">First name</span>
                      <input
                        type="text"
                        required
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold text-[#1A1A1A]">Last name</span>
                      <input
                        type="text"
                        required
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
                ) : null}
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
                {!isSignup ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onForgotPassword}
                      className="text-xs font-semibold underline disabled:opacity-60"
                      style={{ color: '#085508' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : null}
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
            {resetSent ? <p className="text-sm text-[#085508]">{resetSent}</p> : null}

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
                onClick={() => switchMode('login', { keepEmailPanel: panel === 'email' })}
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
                onClick={() => switchMode('signup', { keepEmailPanel: panel === 'email' })}
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
