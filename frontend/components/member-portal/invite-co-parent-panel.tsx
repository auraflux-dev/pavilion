'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { trackEvent } from '@/lib/ga'
import { normalizeInviteEmail, validateInviteEmailPair } from '@/lib/email-invite-client'
import { useFormString } from '@/components/member-portal/portal-form-copy-context'

type Guardian = {
  email: string
  status: string
}

export function InviteCoParentPanel() {
  const t = useFormString
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [acceptUrl, setAcceptUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)
  const [primaryParentEmail, setPrimaryParentEmail] = useState('')
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [note, setNote] = useState('')
  const statusRef = useRef<HTMLParagraphElement>(null)

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true)
    else setInitialLoading(true)
    try {
      const r = await fetch('/api/portal/guardians')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load')
      setIsPrimary(Boolean(d.isPrimary))
      setPrimaryParentEmail(String(d.primaryParentEmail ?? ''))
      setGuardians(d.guardians ?? [])
      setNote(String(d.note ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load family links')
    } finally {
      if (opts?.soft) setRefreshing(false)
      else setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function showStatus(next: { error?: string; msg?: string }) {
    setError(next.error ?? '')
    setMsg(next.msg ?? '')
    window.requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  async function invite(acceptSuggestion = false) {
    const validationError = validateInviteEmailPair(email, confirmEmail)
    if (validationError) {
      showStatus({ error: validationError })
      return
    }

    setBusy(true)
    setMsg('')
    setError('')
    setAcceptUrl('')
    setCopied(false)
    try {
      const r = await fetch('/api/portal/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, confirmEmail, acceptSuggestion }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        if (typeof d.suggestion === 'string' && d.suggestion) setSuggestion(d.suggestion)
        throw new Error(typeof d.error === 'string' ? d.error : 'Invite failed')
      }
      setSuggestion('')
      showStatus({ msg: d.message || 'Invite sent.' })
      trackEvent('invite_guardian', { surface: 'member' })
      if (d.acceptUrl) setAcceptUrl(String(d.acceptUrl))
      setEmail('')
      setConfirmEmail('')
      await load({ soft: true })
    } catch (err) {
      showStatus({ error: err instanceof Error ? err.message : 'Invite failed' })
    } finally {
      setBusy(false)
    }
  }

  function applySuggestion() {
    if (!suggestion) return
    setEmail(suggestion)
    setConfirmEmail(suggestion)
    setSuggestion('')
    showStatus({ msg: `Updated to ${suggestion}. Send invite to confirm.` })
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
      showStatus({ msg: 'Removed.' })
      await load({ soft: true })
    } catch (err) {
      showStatus({ error: err instanceof Error ? err.message : 'Could not remove' })
    } finally {
      setBusy(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--brand-green)]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">{t('invite.title')}</h3>
        </div>
        <p className="text-xs text-[#5A6070]">{t('invite.loading')}</p>
      </div>
    )
  }

  function StatusBanner() {
    if (error) {
      return (
        <p ref={statusRef} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          {error}
        </p>
      )
    }
    if (msg) {
      return (
        <p ref={statusRef} className="rounded-lg border border-[#B8D4C4] bg-[#F0FAF4] px-3 py-2 text-xs font-medium text-[#1B2A4A]">
          {msg}
        </p>
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[var(--brand-green)]" />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">{t('invite.title')}</h3>
      </div>
      <p className="text-xs text-[#5A6070] leading-relaxed whitespace-pre-line">{note}</p>

      {!isPrimary ? (
        <p className="text-xs text-[#1B2A4A]">
          Linked to the account of <strong>{primaryParentEmail}</strong>.
        </p>
      ) : (
        <form
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault()
            void invite(Boolean(suggestion && normalizeInviteEmail(email) === suggestion))
          }}
          className="space-y-2"
        >
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value)
              if (error) setError('')
            }}
            placeholder={t('invite.email')}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="email"
            autoComplete="off"
            value={confirmEmail}
            onChange={(ev) => {
              setConfirmEmail(ev.target.value)
              if (error) setError('')
            }}
            placeholder={t('invite.confirmEmail')}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
            {`They get their own login for the same students.
We email this exact address. A mistype bounces.`}
          </p>
          <Button
            type="submit"
            disabled={busy || refreshing}
            className="text-white w-full sm:w-auto"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {busy ? 'Sending…' : refreshing ? 'Updating list…' : t('invite.submit')}
          </Button>
          <StatusBanner />
          {acceptUrl ? (
            <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[#FAFCF9] px-3 py-2">
              <p className="text-[11px] font-semibold text-[#1A1A1A]">Invite link (share if email is slow)</p>
              <p className="text-[11px] break-all text-[#5A6070]">
                <a href={acceptUrl} className="underline">
                  {acceptUrl}
                </a>
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          ) : null}
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
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {`No shared logins yet.
Invite a spouse, co-parent, or guardian so both see the same students.`}
        </p>
      ) : null}

      {!isPrimary ? <StatusBanner /> : null}
    </div>
  )
}
