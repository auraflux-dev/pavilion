'use client'

import { useState } from 'react'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

const ROLES = ['President', 'Treasurer', 'VP / board', 'Other']

const fieldClass =
  'mb-4 mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800'

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
        setError(data.error || 'Signup unavailable right now.')
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
    <form onSubmit={onSubmit} className="mt-6">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
        School or PTO name
      </label>
      <input
        required
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        className={fieldClass}
      />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
        City
      </label>
      <input
        required
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className={fieldClass}
      />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
        Work email
      </label>
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldClass}
      />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
        Your role
      </label>
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
      {error ? (
        <p className="mb-3 whitespace-pre-line text-sm text-red-800">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 w-full rounded-xl bg-emerald-900 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-950 disabled:opacity-60"
      >
        {busy ? 'Securing workspace…' : `Secure Your Workspace · $${COMMONS_LIST_PRICE_USD}/mo`}
      </button>
      <p className="mt-4 text-sm font-normal leading-relaxed text-slate-600">
        Instant access to Staff. Parent payments connect directly to your school&apos;s existing
        Square account.
      </p>
    </form>
  )
}
