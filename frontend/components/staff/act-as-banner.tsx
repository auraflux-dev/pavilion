'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function ActAsBanner() {
  const [info, setInfo] = useState<{ actingAs: boolean; viewingEmail: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.actingAs) setInfo({ actingAs: true, viewingEmail: d.viewingEmail })
      })
      .catch(() => undefined)
  }, [])

  if (!info?.actingAs) return null

  async function exit() {
    await fetch('/api/staff/act-as', { method: 'DELETE' })
    window.location.href = '/staff'
  }

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <strong>Admin act-as:</strong> viewing member portal as {info.viewingEmail}. Edits are disabled for safety.
          exit to return to staff tools.
        </p>
        <div className="flex gap-3">
          <Link href="/staff" className="font-bold underline">
            Staff home
          </Link>
          <button type="button" onClick={exit} className="font-bold underline">
            Exit act-as
          </button>
        </div>
      </div>
    </div>
  )
}
