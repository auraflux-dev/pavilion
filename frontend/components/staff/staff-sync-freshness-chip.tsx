'use client'

import { useEffect, useState } from 'react'

type SyncPayload = {
  configured?: boolean
  squareSilent?: boolean
  plaidSilent?: boolean
  backupSilent?: boolean
  squareLastOkAt?: string | null
  plaidLastOkAt?: string | null
  backupLastOkAt?: string | null
  squareError?: string
  plaidError?: string
  backupError?: string
}

export function StaffSyncFreshnessChip() {
  const [state, setState] = useState<SyncPayload | null>(null)

  useEffect(() => {
    fetch('/api/commons/sync-status')
      .then(async (r) => {
        const data = (await r.json()) as SyncPayload
        if (!r.ok) return
        setState(data)
      })
      .catch(() => null)
  }, [])

  if (!state?.configured) return null
  const silent = state.squareSilent || state.plaidSilent || state.backupSilent
  if (!silent) return null

  const parts: string[] = []
  if (state.squareSilent) parts.push('Square')
  if (state.plaidSilent) parts.push('Plaid')
  if (state.backupSilent) parts.push('backup')

  return (
    <p
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900"
      role="status"
    >
      {parts.join(', ')} silent for more than 24 hours. Live money on the site may be stale. CSV is
      repair only.
    </p>
  )
}
