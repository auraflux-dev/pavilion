'use client'

import { useState } from 'react'
import { PRODUCT_NAME } from '@/lib/brand'

export function AccountSignInForm() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [devLink, setDevLink] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setDevLink('')
    try {
      const res = await fetch('/api/account/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        message?: string
        error?: string
        devLink?: string
      }
      if (!res.ok) {
        setError(data.error || 'Could not send link.')
        setBusy(false)
        return
      }
      setMessage(data.message || 'Check your email for a sign-in link.')
      if (data.devLink) setDevLink(data.devLink)
    } catch {
      setError('Network error. Try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block text-sm text-slate-900">
        <span className="font-medium">Email on your {PRODUCT_NAME} invoice</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
          {message}
        </p>
      ) : null}
      {devLink ? (
        <p className="break-all text-xs text-emerald-900">
          Dev link: <a href={devLink}>{devLink}</a>
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  )
}

export function AccountDashboard(props: {
  email: string
  schoolName: string
  status: string
  hasCustomer: boolean
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function openPortal() {
    setBusy('portal')
    setError('')
    try {
      const res = await fetch('/api/account/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || 'Portal unavailable.')
        setBusy(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error.')
      setBusy(null)
    }
  }

  async function logout() {
    await fetch('/api/account/logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="card-surface">
        <p className="text-base font-normal leading-relaxed text-slate-600">Signed in as</p>
        <p className="text-lg font-semibold text-slate-900">{props.email}</p>
        {props.schoolName ? (
          <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
            {props.schoolName}
          </p>
        ) : null}
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Status: {props.status || 'unknown'}
        </p>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Billing</h2>
        <p className="whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
          {`Invoices, payment method, and cancel live in Stripe.
Sold by HSKRG LLC.
Day-to-day school work lives in your Staff portal, not here.`}
        </p>
        <button
          type="button"
          disabled={busy !== null || !props.hasCustomer}
          onClick={openPortal}
          className="btn-primary disabled:opacity-60"
        >
          {busy === 'portal' ? 'Opening…' : 'Open billing portal'}
        </button>
        {!props.hasCustomer ? (
          <p className="text-base font-normal leading-relaxed text-slate-600">
            No Stripe customer linked yet. If you just paid, wait a minute and refresh.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={logout}
        className="text-sm font-semibold text-emerald-900 hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
