'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Status = {
  configured?: boolean
  plan?: string
  trialEndsAt?: string | null
  holdEndsAt?: string | null
  writesAllowed?: boolean
  tempHost?: string
  customDomain?: string
}

export function StaffTrialBanner() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    fetch('/api/commons/trial/status')
      .then(async (r) => {
        const d = (await r.json()) as Status
        if (d.configured) setStatus(d)
      })
      .catch(() => null)
  }, [])

  if (!status || status.plan === 'demo' || status.plan === 'active') return null

  const ends = status.trialEndsAt ? new Date(status.trialEndsAt).toLocaleDateString() : ''
  const hold = status.holdEndsAt ? new Date(status.holdEndsAt).toLocaleDateString() : ''

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#FFF8E8] px-4 py-3 text-sm whitespace-pre-line">
      {status.plan === 'trial' && status.writesAllowed
        ? `30-day trial. Writes are on through ${ends}.\nTemp host: ${status.tempHost || 'pending'}.`
        : `Trial ended ${ends}. Reads stay. Writes are off.\nData is kept until ${hold}, then we export and delete.`}
      {'\n'}
      <Link href="/staff?view=site" className="underline font-semibold" style={{ color: 'var(--brand-green)' }}>
        Point your own domain
      </Link>
    </div>
  )
}
