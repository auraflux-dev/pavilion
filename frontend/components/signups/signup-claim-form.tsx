'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  downloadIcsFile,
  formatSlotWhen,
  generateGoogleCalendarUrl,
  generateOutlookWebUrl,
  type CalendarEvent,
} from '@/lib/signups/calendar'
import type { SignupSheetField, SignupSlot, SignupSlotClaimant } from '@/lib/signups/types'

type PublicSlot = SignupSlot & {
  quantityRemaining?: number
  claimants?: SignupSlotClaimant[]
}

export type SignupActor = {
  name: string
  email: string
} | null

type Props = {
  slug: string
  fields: SignupSheetField[]
  slots: PublicSlot[]
  location?: string
  sheetTitle?: string
  timezone?: string
  actor?: SignupActor
  requireStaffIdentity?: boolean
}

type SuccessState = {
  slot: PublicSlot
  registrationId: string
  name: string
  email: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function CalendarMenu({ event, fileStem }: { event: CalendarEvent; fileStem: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onDoc = () => setOpen(false)
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-lg border border-[var(--border,#E5E2DC)] bg-white px-3 py-1.5 text-sm text-[#1A1A1A] hover:bg-[#F7F5F0]"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        Add to calendar
      </button>
      {open ? (
        <div
          className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-[var(--border,#E5E2DC)] bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={generateGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F7F5F0]"
          >
            Google Calendar
          </a>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F7F5F0]"
            onClick={() => {
              downloadIcsFile(event, `${fileStem}.ics`)
              setOpen(false)
            }}
          >
            iCal / Outlook (.ics)
          </button>
          <a
            href={generateOutlookWebUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F7F5F0]"
          >
            Outlook / Office 365
          </a>
        </div>
      ) : null}
    </div>
  )
}

export function SignupClaimForm({
  slug,
  fields,
  slots: initialSlots,
  location = '',
  sheetTitle = 'Sign-up',
  timezone = 'America/New_York',
  actor = null,
  requireStaffIdentity = false,
}: Props) {
  const [slots, setSlots] = useState(initialSlots)
  useEffect(() => {
    setSlots(initialSlots)
  }, [initialSlots])

  const [openOnly, setOpenOnly] = useState(false)
  const [busySlotId, setBusySlotId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [claimSlotId, setClaimSlotId] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const signedIn = Boolean(actor?.email)
  const myEmail = (actor?.email || guestEmail || '').trim().toLowerCase()

  const visibleSlots = useMemo(() => {
    const sorted = [...slots].sort((a, b) => {
      const aT = a.startsAt ? Date.parse(a.startsAt) : a.sortOrder
      const bT = b.startsAt ? Date.parse(b.startsAt) : b.sortOrder
      return aT - bT
    })
    if (!openOnly) return sorted
    return sorted.filter((s) => {
      const remaining = s.quantityRemaining ?? Math.max(0, s.quantityNeeded - s.quantityClaimed)
      return remaining > 0
    })
  }, [slots, openOnly])

  const extraFields = fields.filter(
    (f) => !['name', 'email', 'phone'].includes(f.fieldKey),
  )
  const [custom, setCustom] = useState<Record<string, string>>({})

  function eventFor(slot: PublicSlot): CalendarEvent {
    const when = formatSlotWhen(slot.startsAt, slot.endsAt, timezone)
    return {
      title: `${sheetTitle}: ${when.dateStr}`,
      description: [slot.description, 'EP Board Night coverage — arrive ~15 min early.']
        .filter(Boolean)
        .join('\n\n'),
      location: location || 'SHMS Library',
      startTime: slot.startsAt || new Date().toISOString(),
      endTime: slot.endsAt || slot.startsAt || new Date().toISOString(),
    }
  }

  function myRegistration(slot: PublicSlot): SignupSlotClaimant | undefined {
    if (!myEmail) return undefined
    return (slot.claimants || []).find((c) => c.email === myEmail)
  }

  async function claimSlot(slot: PublicSlot, name: string, email: string, phone = '') {
    setBusySlotId(slot.id)
    setError('')
    const snapshot = slots
    const optimistic: SignupSlotClaimant = {
      registrationId: `temp_${Date.now()}`,
      name,
      email: email.toLowerCase(),
    }
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slot.id) return s
        const claimed = s.quantityClaimed + 1
        return {
          ...s,
          quantityClaimed: claimed,
          quantityRemaining: Math.max(0, s.quantityNeeded - claimed),
          claimants: [...(s.claimants || []), optimistic],
        }
      }),
    )
    try {
      const r = await fetch(`/api/signups/${encodeURIComponent(slug)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          customAnswers: custom,
          slots: [{ slotId: slot.id, quantity: 1 }],
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sign-up failed')
      const reg = (d.registrations || [])[0] as
        | {
            id: string
            slotId: string
            participantName: string
            participantEmail: string
          }
        | undefined
      if (reg) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== slot.id) return s
            return {
              ...s,
              claimants: (s.claimants || []).map((c) =>
                c.registrationId === optimistic.registrationId
                  ? {
                      registrationId: reg.id,
                      name: reg.participantName || name,
                      email: (reg.participantEmail || email).toLowerCase(),
                    }
                  : c,
              ),
            }
          }),
        )
        setSuccess({
          slot,
          registrationId: reg.id,
          name: reg.participantName || name,
          email: (reg.participantEmail || email).toLowerCase(),
        })
      }
      setClaimSlotId(null)
    } catch (err) {
      setSlots(snapshot)
      setError(err instanceof Error ? err.message : 'Sign-up failed')
    } finally {
      setBusySlotId(null)
    }
  }

  async function cancelRegistration(slot: PublicSlot, registrationId: string, email: string) {
    setBusySlotId(slot.id)
    setError('')
    const prev = slots
    setSlots((cur) =>
      cur.map((s) => {
        if (s.id !== slot.id) return s
        const claimants = (s.claimants || []).filter((c) => c.registrationId !== registrationId)
        const claimed = Math.max(0, s.quantityClaimed - 1)
        return {
          ...s,
          claimants,
          quantityClaimed: claimed,
          quantityRemaining: Math.max(0, s.quantityNeeded - claimed),
        }
      }),
    )
    setSuccess(null)
    try {
      const r = await fetch(`/api/signups/${encodeURIComponent(slug)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, email }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not cancel')
    } catch (err) {
      setSlots(prev)
      setError(err instanceof Error ? err.message : 'Could not cancel')
    } finally {
      setBusySlotId(null)
    }
  }

  async function onSignUpClick(slot: PublicSlot) {
    if (requireStaffIdentity && !signedIn) {
      setError('Sign in with your board email to claim a slot')
      return
    }
    if (signedIn && actor) {
      await claimSlot(slot, actor.name, actor.email)
      return
    }
    setClaimSlotId(slot.id)
  }

  const claimTarget = claimSlotId ? slots.find((s) => s.id === claimSlotId) : null
  const signInHref = `/api/auth/google?returnTo=${encodeURIComponent(`/signups/${slug}`)}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border,#E5E2DC)] bg-white px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">Board night coverage</p>
          <p className="text-xs text-[#5A6070]">
            {signedIn && actor
              ? `Signed in as ${actor.name} · ${actor.email}`
              : 'Anyone can view coverage. Sign in for one-click claims, or enter your name and email.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!signedIn ? (
            <a
              href={signInHref}
              className="text-sm font-medium text-[#1A1A1A] underline underline-offset-2"
            >
              Sign in
            </a>
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#1A1A1A]">
            <span className="relative inline-flex h-5 w-9 items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              <span className="absolute inset-0 rounded-full bg-[#D6D3CD] transition peer-checked:bg-[#2F6B4F]" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
            </span>
            Show open spots only
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-[#FFF1F0] px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const remaining =
            slot.quantityRemaining ?? Math.max(0, slot.quantityNeeded - slot.quantityClaimed)
          const claimants = slot.claimants || []
          const full = remaining <= 0
          const mine = myRegistration(slot)
          const when = formatSlotWhen(slot.startsAt, slot.endsAt, timezone)
          const busy = busySlotId === slot.id
          const status = mine ? 'mine' : full ? 'filled' : 'available'

          return (
            <div
              key={slot.id}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-[#1A1A1A]">{when.dateStr}</span>
                  {when.timeStr ? (
                    <span className="text-sm text-[#5A6070]">{when.timeStr}</span>
                  ) : null}
                  {status === 'available' ? (
                    <span className="rounded bg-[#E7F4EC] px-2 py-0.5 text-xs font-medium text-[#1F6B45]">
                      Available · {remaining} left
                    </span>
                  ) : null}
                  {status === 'filled' ? (
                    <span className="rounded bg-[#ECEAE6] px-2 py-0.5 text-xs font-medium text-[#5A6070]">
                      Filled
                    </span>
                  ) : null}
                  {status === 'mine' ? (
                    <span className="rounded bg-[#E8EEF7] px-2 py-0.5 text-xs font-medium text-[#1E4A8A]">
                      My slot
                    </span>
                  ) : null}
                </div>
                {slot.description ? (
                  <p className="text-sm text-[#5A6070]">{slot.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {claimants.length === 0 ? (
                    <span className="text-sm text-[#5A6070]">No one signed up yet</span>
                  ) : (
                    claimants.map((c) => (
                      <span
                        key={c.registrationId}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border,#E5E2DC)] bg-[#F7F5F0] py-1 pl-1 pr-3 text-sm text-[#1A1A1A]"
                        title={c.email}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2F6B4F] text-[11px] font-semibold text-white">
                          {initials(c.name)}
                        </span>
                        {c.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {slot.startsAt ? (
                  <CalendarMenu
                    event={eventFor(slot)}
                    fileStem={`ep-board-${when.dateStr.replace(/\W+/g, '-').toLowerCase()}`}
                  />
                ) : null}
                {mine ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void cancelRegistration(slot, mine.registrationId, mine.email)}
                  >
                    {busy ? 'Updating…' : 'Cancel my sign-up'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={full || busy}
                    onClick={() => void onSignUpClick(slot)}
                  >
                    {busy ? 'Signing up…' : full ? 'Full' : 'Sign up'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
        {visibleSlots.length === 0 ? (
          <p className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-4 text-sm text-[#5A6070]">
            No open nights right now. Turn off “Show open spots only” to see who already signed up.
          </p>
        ) : null}
      </div>

      {claimTarget ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Quick sign-up</h2>
            <p className="mt-1 text-sm text-[#5A6070]">
              {formatSlotWhen(claimTarget.startsAt, claimTarget.endsAt, timezone).dateStr}
              {formatSlotWhen(claimTarget.startsAt, claimTarget.endsAt, timezone).timeStr
                ? ` · ${formatSlotWhen(claimTarget.startsAt, claimTarget.endsAt, timezone).timeStr}`
                : ''}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium">Full name</span>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Phone (optional)</span>
                <input
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="For SMS reminders later"
                />
              </label>
              {extraFields.map((field) => (
                <label key={field.id} className="block text-sm">
                  <span className="font-medium">{field.label}</span>
                  {field.fieldType === 'textarea' ? (
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                      value={custom[field.fieldKey] || ''}
                      onChange={(e) => setCustom({ ...custom, [field.fieldKey]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                      value={custom[field.fieldKey] || ''}
                      onChange={(e) => setCustom({ ...custom, [field.fieldKey]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setClaimSlotId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busySlotId === claimTarget.id || !guestName.trim() || !guestEmail.includes('@')}
                onClick={() =>
                  void claimSlot(claimTarget, guestName.trim(), guestEmail.trim(), guestPhone.trim())
                }
              >
                Confirm sign-up
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[#1A1A1A]">You’re signed up</h2>
            <p className="mt-2 text-sm text-[#5A6070]">
              {success.name} ·{' '}
              {formatSlotWhen(success.slot.startsAt, success.slot.endsAt, timezone).dateStr}
              {formatSlotWhen(success.slot.startsAt, success.slot.endsAt, timezone).timeStr
                ? ` · ${formatSlotWhen(success.slot.startsAt, success.slot.endsAt, timezone).timeStr}`
                : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CalendarMenu
                event={eventFor(success.slot)}
                fileStem={`ep-board-${success.registrationId}`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void cancelRegistration(success.slot, success.registrationId, success.email)
                }
              >
                Remove me
              </Button>
              <Button type="button" onClick={() => setSuccess(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
