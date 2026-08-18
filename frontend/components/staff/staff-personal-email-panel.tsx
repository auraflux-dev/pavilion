'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

/**
 * Board member self-service: link personal email for the parent portal.
 * Staff work stays on @shmspto.org; family (students / Cove) uses personal login.
 */
export function StaffPersonalEmailPanel({
  initialEmail = '',
  onSaved,
}: {
  initialEmail?: string
  onSaved?: (email: string) => void
}) {
  const [personalEmail, setPersonalEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setPersonalEmail(initialEmail)
  }, [initialEmail])

  async function save() {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/staff/personal-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalEmail }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save')
      const saved = String(data.personalEmail ?? '')
      setPersonalEmail(saved)
      onSaved?.(saved)
      setStatus(
        saved
          ? 'Saved. Sign out of Staff, then Log in with this personal email for the Member Portal.'
          : 'Cleared. Add a personal email when you are ready.',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--brand-green)]/30 bg-white p-4 space-y-3">
      <div>
        <h2 className="text-base font-bold text-[#1A1A1A]">Your parent portal email</h2>
        <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
          {vanillaizeIfDemo(
            'Staff hierarchy uses your @shmspto.org login. Add your personal email so you can also be a parent: students, Cove Digital Card, and membership live under that personal login.',
          )}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={personalEmail}
          onChange={(e) => setPersonalEmail(e.target.value)}
          placeholder="you@gmail.com"
          className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          autoComplete="email"
        />
        <Button
          disabled={busy}
          onClick={() => void save()}
          className="text-white font-semibold shrink-0"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? 'Saving…' : 'Save personal email'}
        </Button>
      </div>
      {personalEmail.trim() ? (
        <p className="text-xs text-[#5A6070]">
          Linked:{' '}
          <span className="font-semibold text-[#1A1A1A]">{personalEmail.trim()}</span>
          {' · '}
          <Link href="/auth/join?mode=login&returnTo=%2Fmember-portal" className="underline font-semibold" style={{ color: 'var(--brand-green)' }}>
            Open Member Portal login
          </Link>
        </p>
      ) : (
        <p className="text-xs text-[#8A4B00]">
          Not linked yet. Save your personal email, then create or log in to a free parent account with
          that same address.
        </p>
      )}
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
