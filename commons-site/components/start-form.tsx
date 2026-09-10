'use client'

import { useState } from 'react'
import { PRODUCT_NAME } from '@/lib/brand'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

const ROLES = ['President', 'Treasurer', 'VP / board', 'Other']

const fieldClass =
  'mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800'

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
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-900">
        School or PTO name
        <input
          required
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium text-slate-900">
        City
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium text-slate-900">
        Work email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium text-slate-900">
        Your role
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={fieldClass}
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
        className="mt-4 w-full rounded-xl bg-emerald-900 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-950 disabled:opacity-60"
      >
        {busy ? 'Opening Stripe…' : `Continue to Stripe · $${COMMONS_LIST_PRICE_USD}/mo`}
      </button>
      <p className="whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600">
        {`You will pay on Stripe for ${PRODUCT_NAME} software.
Your school still uses its own Square for parent cards and in-person sales.
We email you next steps within one business day.
Tenant setup is provisioned by HSKRG after pay. Not automatic at checkout.`}
      </p>
    </form>
  )
}
