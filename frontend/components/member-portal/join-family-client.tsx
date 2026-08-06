'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function JoinFamilyClient() {
  const params = useSearchParams()
  const router = useRouter()
  const token = String(params.get('token') ?? '').trim()
  const [preview, setPreview] = useState<{
    guardianEmail?: string
    primaryParentEmail?: string
    invitedByName?: string
    status?: string
    error?: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setPreview({ error: 'Missing invite link.' })
      return
    }
    fetch(`/api/portal/guardians/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) setPreview({ error: d.error ?? 'Invite not found' })
        else setPreview(d)
      })
      .catch(() => setPreview({ error: 'Could not load invite' }))
  }, [token])

  async function accept() {
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/portal/guardians/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await r.json()
      if (r.status === 401) {
        const returnTo = `/member-portal/join-family?token=${encodeURIComponent(token)}`
        router.push(`/auth/join?mode=login&returnTo=${encodeURIComponent(returnTo)}`)
        return
      }
      if (!r.ok) throw new Error(d.error ?? 'Could not accept')
      setMsg(d.message || 'Linked.')
      setTimeout(() => router.push('/member-portal'), 1200)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not accept')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold text-[#1B2A4A]">Join a family portal</h1>
      {preview?.error ? (
        <p className="text-sm text-red-700">{preview.error}</p>
      ) : preview ? (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] p-4 space-y-2 text-sm">
          <p>
            {preview.invitedByName ? (
              <>
                <strong>{preview.invitedByName}</strong> invited you
              </>
            ) : (
              'You’ve been invited'
            )}{' '}
            to share the SHMS PTO member portal
            {preview.primaryParentEmail ? (
              <>
                {' '}
                for <strong>{preview.primaryParentEmail}</strong>
              </>
            ) : null}
            .
          </p>
          <p className="text-xs text-[#5A6070]">
            Sign in as <strong>{preview.guardianEmail}</strong>. You’ll see the same students.
            Cove Digital Card stays with the primary parent unless you buy separately.
          </p>
          <p className="text-[11px] text-[#5A6070]">Status: {preview.status}</p>
        </div>
      ) : (
        <p className="text-sm text-[#5A6070]">Loading invite…</p>
      )}

      {msg ? <p className="text-sm text-[#1B2A4A]">{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || Boolean(preview?.error) || !token}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
          onClick={() => void accept()}
        >
          Accept invite
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/member-portal">Member portal</Link>
        </Button>
      </div>
    </div>
  )
}
