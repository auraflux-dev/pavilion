'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

type Guardian = {
  email: string
  status: string
  invitedAt: string | null
  acceptedAt: string | null
}

export function InviteCoParentPanel() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [acceptUrl, setAcceptUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)
  const [primaryParentEmail, setPrimaryParentEmail] = useState('')
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/portal/guardians')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load')
      setIsPrimary(Boolean(d.isPrimary))
      setPrimaryParentEmail(String(d.primaryParentEmail ?? ''))
      setGuardians(d.guardians ?? [])
      setNote(String(d.note ?? ''))
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not load family links')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function invite(e: React.FormEvent, acceptSuggestion = false) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    setAcceptUrl('')
    setSuggestion('')
    setCopied(false)
    try {
      const r = await fetch('/api/portal/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, confirmEmail, acceptSuggestion }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (typeof d.suggestion === 'string' && d.suggestion) setSuggestion(d.suggestion)
        throw new Error(d.error ?? 'Invite failed')
      }
      setMsg(d.message || 'Invite sent.')
      if (d.acceptUrl) setAcceptUrl(String(d.acceptUrl))
      setEmail('')
      setConfirmEmail('')
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  function applySuggestion() {
    if (!suggestion) return
    setEmail(suggestion)
    setConfirmEmail(suggestion)
    setSuggestion('')
    setMsg(`Updated to ${suggestion}. Send invite to confirm.`)
  }

  async function copyLink() {
    if (!acceptUrl) return
    try {
      await navigator.clipboard.writeText(acceptUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this invite link:', acceptUrl)
    }
  }

  async function revoke(guardianEmail: string) {
    if (!confirm(`Remove ${guardianEmail} from this family account?`)) return
    setBusy(true)
    try {
      const r = await fetch('/api/portal/guardians', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guardianEmail }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not remove')
      setMsg('Removed.')
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[#5A6070]">Loading household adults…</p>
  }

  return (
    <div className="rounded-xl border border-[#E8E4DC] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[#085508]" />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Household adults</h3>
      </div>
      <p className="text-xs text-[#5A6070] leading-relaxed">{note}</p>

      {!isPrimary ? (
        <p className="text-xs text-[#1B2A4A]">
          Linked to household of <strong>{primaryParentEmail}</strong>.
        </p>
      ) : (
        <form onSubmit={(ev) => void invite(ev)} className="space-y-2">
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="Spouse, co-parent, or guardian email"
            className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            autoComplete="off"
            value={confirmEmail}
            onChange={(ev) => setConfirmEmail(ev.target.value)}
            placeholder="Type that email again to confirm"
            className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-[#5A6070]">
            We email them this exact address. A mistype bounces. You also get a copy with a share
            link.
          </p>
          <Button
            type="submit"
            disabled={busy}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            Send invite
          </Button>
        </form>
      )}

      {suggestion ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={applySuggestion}>
            Use {suggestion}
          </Button>
        </div>
      ) : null}

      {guardians.length > 0 ? (
        <ul className="space-y-2">
          {guardians.map((g) => (
            <li
              key={g.email}
              className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-[#F0EDE8] pt-2"
            >
              <span>
                {g.email}{' '}
                <span className="text-[11px] text-[#5A6070]">· {g.status}</span>
              </span>
              {isPrimary ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void revoke(g.email)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : isPrimary ? (
        <p className="text-xs text-[#5A6070]">
          No other adults linked yet. Invite a spouse, co-parent, or guardian so both logins see the
          same students.
        </p>
      ) : null}

      {msg ? <p className="text-xs text-[#1B2A4A]">{msg}</p> : null}
      {acceptUrl ? (
        <div className="space-y-1">
          <p className="text-[11px] break-all text-[#5A6070]">
            Share link:{' '}
            <a href={acceptUrl} className="underline">
              {acceptUrl}
            </a>
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
