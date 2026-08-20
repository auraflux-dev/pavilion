'use client'

import { useState } from 'react'
import { PRODUCT_NAME } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

const ROLES = ['President', 'Treasurer', 'VP / board', 'Other']

export function StartForm() {
  const [schoolName, setSchoolName] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, city, email, role }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || 'Checkout unavailable right now.')
        setBusy(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <label className="block text-sm">
        <span className="font-medium">School or PTO name</span>
        <input
          required
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">City</span>
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Work email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Your role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="whitespace-pre-line text-sm text-red-800">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)] disabled:opacity-60"
      >
        {busy ? 'Opening Stripe…' : `Continue to Stripe · $${COMMONS_LIST_PRICE_USD}/mo`}
      </button>
      <p className="whitespace-pre-line text-xs text-[var(--ink-muted)]">
        {`You will pay on Stripe for ${PRODUCT_NAME} software.\nYour school still uses its own Square for parent cards and in-person sales.\nWe email you next steps within one business day.\nTenant setup is provisioned by HSKRG after pay. Not automatic at checkout.`}
      </p>
    </form>
  )
}
