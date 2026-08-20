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
      <label className="block text-sm">
        <span className="font-medium">Email on your {PRODUCT_NAME} invoice</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="whitespace-pre-line text-sm text-[var(--ink-muted)]">{message}</p>
      ) : null}
      {devLink ? (
        <p className="break-all text-xs text-[var(--accent)]">
          Dev link: <a href={devLink}>{devLink}</a>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)] disabled:opacity-60"
      >
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
  addons: { id: string; title: string; usd: number; ready: boolean }[]
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

  async function buyAddon(addonId: string) {
    setBusy(addonId)
    setError('')
    try {
      const res = await fetch('/api/account/addon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || 'Add-on checkout unavailable.')
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
      <div className="rounded-lg border border-[var(--line)] bg-[var(--paper-deep)] p-5">
        <p className="text-sm text-[var(--ink-muted)]">Signed in as</p>
        <p className="font-semibold">{props.email}</p>
        {props.schoolName ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{props.schoolName}</p>
        ) : null}
        <p className="mt-1 text-xs uppercase tracking-wide text-[var(--ink-muted)]">
          Status: {props.status || 'unknown'}
        </p>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Billing</h2>
        <p className="whitespace-pre-line text-sm text-[var(--ink-muted)]">
          {`Invoices, payment method, and cancel live in Stripe.\nSold by HSKRG LLC.`}
        </p>
        <button
          type="button"
          disabled={busy !== null || !props.hasCustomer}
          onClick={openPortal}
          className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)] disabled:opacity-60"
        >
          {busy === 'portal' ? 'Opening…' : 'Open billing portal'}
        </button>
        {!props.hasCustomer ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No Stripe customer linked yet. If you just paid, wait a minute and refresh.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Add-ons</h2>
        <ul className="space-y-4">
          {props.addons.map((a) => (
            <li key={a.id} className="border-t border-[var(--line)] pt-4">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">${a.usd}/mo</p>
              <button
                type="button"
                disabled={busy !== null || !a.ready}
                onClick={() => buyAddon(a.id)}
                className="mt-2 rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--paper-deep)] disabled:opacity-50"
              >
                {!a.ready
                  ? 'Email us to add'
                  : busy === a.id
                    ? 'Opening…'
                    : 'Add on Stripe'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={logout} className="text-sm text-[var(--accent)] hover:underline">
        Sign out
      </button>
    </div>
  )
}
