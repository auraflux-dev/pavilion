'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
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

type ViewMode = 'grid' | 'agenda'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function slotLocalDate(slot: PublicSlot, timeZone: string): Date | null {
  if (!slot.startsAt) return null
  const key = new Date(slot.startsAt).toLocaleDateString('en-CA', { timeZone })
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function remainingOf(slot: PublicSlot): number {
  return slot.quantityRemaining ?? Math.max(0, slot.quantityNeeded - slot.quantityClaimed)
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
          className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-[var(--border,#E5E2DC)] bg-white py-1 shadow-lg"
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

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [openOnly, setOpenOnly] = useState(false)
  const [busySlotId, setBusySlotId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [showGuestForm, setShowGuestForm] = useState(false)

  const signedIn = Boolean(actor?.email)
  const myEmail = (actor?.email || guestEmail || '').trim().toLowerCase()

  const datedSlots = useMemo(() => {
    return slots
      .map((slot) => ({ slot, date: slotLocalDate(slot, timezone) }))
      .filter((x): x is { slot: PublicSlot; date: Date } => Boolean(x.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.slot.sortOrder - b.slot.sortOrder)
  }, [slots, timezone])

  const firstMonth = datedSlots[0]?.date ?? new Date(2026, 8, 1)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(firstMonth))

  const filteredDated = useMemo(() => {
    if (!openOnly) return datedSlots
    return datedSlots.filter(({ slot }) => remainingOf(slot) > 0)
  }, [datedSlots, openOnly])

  const monthGroups = useMemo(() => {
    const map = new Map<string, { label: string; monthStart: Date; items: typeof filteredDated }>()
    for (const item of filteredDated) {
      const key = format(item.date, 'yyyy-MM')
      const label = format(item.date, 'MMMM yyyy')
      const existing = map.get(key)
      if (existing) existing.items.push(item)
      else map.set(key, { label, monthStart: startOfMonth(item.date), items: [item] })
    }
    return [...map.values()]
  }, [filteredDated])

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const today = startOfMonth(new Date())
    setExpandedMonths((prev) => {
      const next = { ...prev }
      for (const g of monthGroups) {
        const key = format(g.monthStart, 'yyyy-MM')
        if (next[key] === undefined) {
          next[key] = g.monthStart >= today || isSameMonth(g.monthStart, today)
        }
      }
      return next
    })
  }, [monthGroups])

  const daySlots = useMemo(() => {
    if (!selectedDay) return [] as PublicSlot[]
    return filteredDated.filter(({ date }) => isSameDay(date, selectedDay)).map((x) => x.slot)
  }, [filteredDated, selectedDay])

  const extraFields = fields.filter((f) => !['name', 'email', 'phone'].includes(f.fieldKey))

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

  function dayStatus(day: Date): {
    hasSlots: boolean
    open: number
    mine: boolean
    full: boolean
  } {
    const onDay = datedSlots.filter(({ date }) => isSameDay(date, day)).map((x) => x.slot)
    if (onDay.length === 0) return { hasSlots: false, open: 0, mine: false, full: false }
    const open = onDay.reduce((n, s) => n + remainingOf(s), 0)
    const mine = onDay.some((s) => Boolean(myRegistration(s)))
    const full = open <= 0
    return { hasSlots: true, open, mine, full }
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
      setShowGuestForm(false)
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
    setShowGuestForm(true)
  }

  function renderCalendarGrid() {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const cells: ReactNode[] = []
    let day = startDate
    while (day <= endDate) {
      const clone = day
      const inMonth = isSameMonth(clone, monthStart)
      const status = dayStatus(clone)
      const hide =
        openOnly && status.hasSlots && status.open <= 0 && !status.mine
      const clickable = status.hasSlots && !hide
      cells.push(
        <button
          key={clone.toISOString()}
          type="button"
          disabled={!clickable}
          onClick={() => clickable && setSelectedDay(clone)}
          className={`min-h-[88px] border border-[var(--border,#E5E2DC)] p-2 text-left transition ${
            !inMonth ? 'bg-[#F3F1EC] text-[#9AA0AB]' : 'bg-white text-[#1A1A1A]'
          } ${clickable ? 'hover:border-[#2F6B4F] hover:shadow-sm cursor-pointer' : 'cursor-default'} ${
            hide ? 'opacity-40' : ''
          }`}
        >
          <span className="text-xs font-semibold">{format(clone, 'd')}</span>
          {status.hasSlots && !hide ? (
            <div className="mt-1.5 flex flex-col gap-1">
              {status.mine ? (
                <span className="rounded bg-[#E8EEF7] px-1.5 py-0.5 text-[11px] font-medium text-[#1E4A8A]">
                  Signed up
                </span>
              ) : null}
              {status.full && !status.mine ? (
                <span className="rounded bg-[#ECEAE6] px-1.5 py-0.5 text-[11px] font-medium text-[#5A6070]">
                  Full
                </span>
              ) : null}
              {!status.full ? (
                <span className="rounded bg-[#E7F4EC] px-1.5 py-0.5 text-[11px] font-medium text-[#1F6B45]">
                  {status.open} open
                </span>
              ) : null}
            </div>
          ) : null}
        </button>,
      )
      day = addDays(day, 1)
    }
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border,#E5E2DC)] bg-white">
        <div className="grid grid-cols-7 border-b border-[var(--border,#E5E2DC)] bg-[#F7F5F0] text-center text-xs font-semibold text-[#5A6070]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{cells}</div>
      </div>
    )
  }

  const signInHref = `/api/auth/google?returnTo=${encodeURIComponent(`/signups/${slug}`)}`

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border,#E5E2DC)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">Board night coverage</p>
          <p className="text-xs text-[#5A6070]">
            {signedIn && actor
              ? `Signed in as ${actor.name} · ${actor.email}`
              : 'Pick a date on the calendar. Sign in for one-click claims, or enter name and email.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!signedIn ? (
            <a href={signInHref} className="text-sm font-medium underline underline-offset-2">
              Sign in
            </a>
          ) : null}
          <div className="inline-flex rounded-lg bg-[#ECEAE6] p-1 text-xs font-medium">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${
                viewMode === 'grid' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#5A6070]'
              }`}
              onClick={() => setViewMode('grid')}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${
                viewMode === 'agenda' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#5A6070]'
              }`}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--border,#E5E2DC)] text-xs font-medium overflow-hidden">
            <button
              type="button"
              className={`px-3 py-1.5 ${!openOnly ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#5A6070]'}`}
              onClick={() => setOpenOnly(false)}
            >
              All days
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 ${openOnly ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#5A6070]'}`}
              onClick={() => setOpenOnly(true)}
            >
              Open spots only
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-[#FFF1F0] px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {viewMode === 'grid' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border,#E5E2DC)]">
              <button
                type="button"
                className="px-3 py-1.5 text-sm hover:bg-[#F7F5F0]"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm hover:bg-[#F7F5F0]"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>
          {renderCalendarGrid()}
        </div>
      ) : (
        <div className="space-y-2">
          {monthGroups.map((group) => {
            const key = format(group.monthStart, 'yyyy-MM')
            const open = expandedMonths[key] !== false
            return (
              <div
                key={key}
                className="overflow-hidden rounded-xl border border-[var(--border,#E5E2DC)] bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() =>
                    setExpandedMonths((prev) => ({ ...prev, [key]: !open }))
                  }
                >
                  <span className="font-semibold text-[#1A1A1A]">{group.label}</span>
                  <span className="text-sm text-[#5A6070]">
                    {group.items.length} night{group.items.length === 1 ? '' : 's'} · {open ? 'Hide' : 'Show'}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-2 border-t border-[var(--border,#E5E2DC)] px-3 py-3">
                    {group.items.map(({ slot, date }) => {
                      const rem = remainingOf(slot)
                      const mine = myRegistration(slot)
                      const when = formatSlotWhen(slot.startsAt, slot.endsAt, timezone)
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border,#E5E2DC)] bg-[#F7F5F0] px-3 py-2 text-left hover:border-[#2F6B4F]"
                          onClick={() => setSelectedDay(date)}
                        >
                          <span>
                            <span className="block font-medium text-[#1A1A1A]">
                              {format(date, 'EEE MMM d')}
                            </span>
                            <span className="text-xs text-[#5A6070]">{when.timeStr}</span>
                          </span>
                          {mine ? (
                            <span className="rounded bg-[#E8EEF7] px-2 py-0.5 text-xs font-medium text-[#1E4A8A]">
                              Signed up
                            </span>
                          ) : rem <= 0 ? (
                            <span className="rounded bg-[#ECEAE6] px-2 py-0.5 text-xs font-medium text-[#5A6070]">
                              Full
                            </span>
                          ) : (
                            <span className="rounded bg-[#E7F4EC] px-2 py-0.5 text-xs font-medium text-[#1F6B45]">
                              {rem} open
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
          {monthGroups.length === 0 ? (
            <p className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-4 text-sm text-[#5A6070]">
              No nights match this filter.
            </p>
          ) : null}
        </div>
      )}

      {selectedDay ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border,#E5E2DC)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[#1A1A1A]">
                {format(selectedDay, 'EEEE, MMM d, yyyy')}
              </h3>
              <button
                type="button"
                className="text-[#5A6070] hover:text-[#1A1A1A]"
                onClick={() => {
                  setSelectedDay(null)
                  setShowGuestForm(false)
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {daySlots.length === 0 ? (
                <p className="text-sm text-[#5A6070]">No coverage slots on this day.</p>
              ) : (
                daySlots.map((slot) => {
                  const when = formatSlotWhen(slot.startsAt, slot.endsAt, timezone)
                  const rem = remainingOf(slot)
                  const mine = myRegistration(slot)
                  const claimants = slot.claimants || []
                  const busy = busySlotId === slot.id
                  const full = rem <= 0
                  return (
                    <div
                      key={slot.id}
                      className="rounded-xl border border-[var(--border,#E5E2DC)] p-4 space-y-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {when.timeStr || 'Evening coverage'}
                        </p>
                        {slot.description ? (
                          <p className="mt-1 text-sm text-[#5A6070]">{slot.description}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-[#5A6070]">
                          {full ? 'Full' : `${rem} of ${slot.quantityNeeded} open`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {claimants.length === 0 ? (
                          <span className="text-sm text-[#5A6070]">No one signed up yet</span>
                        ) : (
                          claimants.map((c) => (
                            <span
                              key={c.registrationId}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border,#E5E2DC)] bg-[#F7F5F0] py-1 pl-1 pr-3 text-sm"
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
                      <div className="flex flex-wrap gap-2">
                        <CalendarMenu
                          event={eventFor(slot)}
                          fileStem={`ep-board-${format(selectedDay, 'yyyy-MM-dd')}`}
                        />
                        {mine ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void cancelRegistration(slot, mine.registrationId, mine.email)
                            }
                          >
                            {busy ? 'Updating…' : 'Cancel sign-up'}
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
                })
              )}

              {showGuestForm && !signedIn ? (
                <div className="rounded-xl border border-[var(--border,#E5E2DC)] p-4 space-y-3">
                  <h4 className="font-semibold text-[#1A1A1A]">Quick sign-up</h4>
                  <label className="block text-sm">
                    <span className="font-medium">Full name</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Email</span>
                    <input
                      type="email"
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
                    />
                  </label>
                  {extraFields.map((field) => (
                    <label key={field.id} className="block text-sm">
                      <span className="font-medium">{field.label}</span>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          className="mt-1 min-h-[64px] w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                          value={custom[field.fieldKey] || ''}
                          onChange={(e) =>
                            setCustom({ ...custom, [field.fieldKey]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                          value={custom[field.fieldKey] || ''}
                          onChange={(e) =>
                            setCustom({ ...custom, [field.fieldKey]: e.target.value })
                          }
                        />
                      )}
                    </label>
                  ))}
                  <Button
                    type="button"
                    disabled={
                      !guestName.trim() ||
                      !guestEmail.includes('@') ||
                      !daySlots[0] ||
                      busySlotId === daySlots[0]?.id
                    }
                    onClick={() => {
                      const target = daySlots.find((s) => remainingOf(s) > 0) || daySlots[0]
                      if (!target) return
                      void claimSlot(
                        target,
                        guestName.trim(),
                        guestEmail.trim(),
                        guestPhone.trim(),
                      )
                    }}
                  >
                    Confirm sign-up
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="border-t border-[var(--border,#E5E2DC)] px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedDay(null)
                  setShowGuestForm(false)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
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
