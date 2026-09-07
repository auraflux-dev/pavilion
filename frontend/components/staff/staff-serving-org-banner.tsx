'use client'

/**
 * Amber banner when a platform owner is serving Client Staff for one org.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  organizationName: string
  organizationId: string
}

export function StaffServingOrgBanner({ organizationName, organizationId }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function exitToPlatform() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/platform/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'platform', organizationId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not exit')
      window.location.href = '/staff?view=home'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not exit')
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#1A1A1A]">Serving {organizationName}</p>
        <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
          {`You are in Client Staff for this org.
CMS writes use this school. Exit when finished.`}
        </p>
        {error ? <p className="text-xs text-amber-900 mt-1">{error}</p> : null}
      </div>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void exitToPlatform()}>
        {busy ? 'Exiting…' : 'Exit to Platform'}
      </Button>
    </section>
  )
}
