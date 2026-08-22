'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const AUTH_BASE_PATH = '/api/id'

function CommonsLoginForm() {
  const search = useSearchParams()
  // Private trials open on the school site first. Staff is a second step, not the lobby.
  const returnTo = search.get('returnTo') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${AUTH_BASE_PATH}/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = (await r.json().catch(() => ({}))) as { message?: string; error?: string }
      if (!r.ok) {
        throw new Error(d.message || d.error || 'Could not sign in.\nCheck the email and password we sent you.')
      }
      window.location.assign(returnTo.startsWith('/') ? returnTo : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12 md:py-16">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--brand-green)' }}
      >
        Commons
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
        Sign in to your school
      </h1>
      <p className="text-sm text-[#5A6070] mb-6 whitespace-pre-line leading-relaxed">
        This trial site is private.
        {'\n'}
        Use the email and password Pavilion sent you.
        {'\n'}
        After sign-in you land on the school homepage.
        {'\n'}
        Staff is in the nav when you want it.
      </p>

      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-sm font-medium">
          Email
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <Input
            className="mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-700 whitespace-pre-line">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}

export default function CommonsLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto px-4 py-12">
          <p className="text-sm text-[#5A6070]">Loading…</p>
        </main>
      }
    >
      <CommonsLoginForm />
    </Suspense>
  )
}
