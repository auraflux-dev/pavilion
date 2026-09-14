'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
  /** Staff identity from session; when set, skips the Your info form. */
  actor?: SignupActor
  requireStaffIdentity?: boolean
}

export function SignupClaimForm({
  slug,
  fields,
  slots,
  actor = null,
  requireStaffIdentity = true,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'open'>('all')

  const useStaffIdentity = requireStaffIdentity
  const signedIn = Boolean(actor?.email)

  const remainingById = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of slots) {
      m.set(s.id, s.quantityRemaining ?? Math.max(0, s.quantityNeeded - s.quantityClaimed))
    }
    return m
  }, [slots])

  const visibleSlots = useMemo(() => {
    if (filter === 'all') return slots
    return slots.filter((s) => (remainingById.get(s.id) ?? 0) > 0)
  }, [filter, slots, remainingById])

  const extraFields = fields.filter(
    (f) => f.fieldKey !== 'name' && f.fieldKey !== 'email' && !(useStaffIdentity && f.fieldKey === 'phone'),
  )

  function toggleSlot(id: string) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (useStaffIdentity && !signedIn) {
        throw new Error('Sign in with your board email to claim a slot')
      }
      const slotsPayload = Object.entries(selected).map(([slotId, quantity]) => ({
        slotId,
        quantity,
      }))
      const r = await fetch(`/api/signups/${encodeURIComponent(slug)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: useStaffIdentity ? actor?.name : name,
          email: useStaffIdentity ? actor?.email : email,
          phone: useStaffIdentity ? '' : phone,
          customAnswers: custom,
          slots: slotsPayload,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sign-up failed')
      if (d.demo && !d.confirmationToken) {
        throw new Error(d.message || 'Demo preview blocked this sign-up. Try again after the demo allowlist refresh.')
      }
      const token = typeof d.confirmationToken === 'string' ? d.confirmationToken.trim() : ''
      const path =
        typeof d.confirmPath === 'string' && d.confirmPath.includes('token=') && !d.confirmPath.includes('token=undefined')
          ? d.confirmPath
          : token
            ? `/signups/${slug}/confirm?token=${encodeURIComponent(token)}`
            : ''
      if (!path) throw new Error('Sign-up succeeded but confirmation link was missing')
      router.push(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      setBusy(false)
    }
  }

  const signInHref = `/api/auth/google?returnTo=${encodeURIComponent(`/signups/${slug}`)}`

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Nights</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 border ${
              filter === 'all'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[var(--border,#E5E2DC)] bg-white text-[#5A6070]'
            }`}
            onClick={() => setFilter('all')}
          >
            All dates
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 border ${
              filter === 'open'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[var(--border,#E5E2DC)] bg-white text-[#5A6070]'
            }`}
            onClick={() => setFilter('open')}
          >
            Open only
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const remaining = remainingById.get(slot.id) ?? 0
          const full = remaining <= 0
          const checked = Boolean(selected[slot.id])
          const claimants = slot.claimants || []
          const canSelect = !full && (!useStaffIdentity || signedIn)
          return (
            <label
              key={slot.id}
              className={`flex gap-3 rounded-xl border p-4 ${
                full ? 'opacity-80 border-[var(--border,#E5E2DC)] bg-[#F7F5F0]' : 'border-[var(--border,#E5E2DC)] bg-white'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={!canSelect}
                checked={checked}
                onChange={() => toggleSlot(slot.id)}
              />
              <span className="flex-1 min-w-0">
                <span className="font-medium text-[#1A1A1A] block">{slot.title}</span>
                {slot.description ? (
                  <span className="text-sm text-[#5A6070] block mt-1">{slot.description}</span>
                ) : null}
                <span className="text-xs text-[#5A6070] block mt-2">
                  {full ? 'Full' : `${remaining} open`}
                  {slot.itemUnit ? ` · ${slot.itemUnit}` : ''}
                </span>
                {claimants.length > 0 ? (
                  <span className="mt-2 block text-sm text-[#1A1A1A]">
                    <span className="font-medium">Signed up:</span>{' '}
                    {claimants.map((c, i) => (
                      <span key={`${c.email}-${i}`}>
                        {i > 0 ? '; ' : ''}
                        {c.name}
                        {c.email ? (
                          <span className="text-[#5A6070]"> ({c.email})</span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="mt-2 block text-sm text-[#5A6070]">No one signed up yet</span>
                )}
              </span>
              {checked && remaining > 1 ? (
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  className="w-16 rounded border border-[var(--border,#E5E2DC)] px-2 py-1 h-9"
                  value={selected[slot.id]}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [slot.id]: Math.min(remaining, Math.max(1, Number(e.target.value) || 1)),
                    }))
                  }
                />
              ) : null}
            </label>
          )
        })}
        {visibleSlots.length === 0 ? (
          <p className="text-sm text-[#5A6070] rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-4">
            No open nights right now. Switch to All dates to see who already signed up.
          </p>
        ) : null}
      </div>

      {useStaffIdentity ? (
        <div className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-5 space-y-2">
          {signedIn && actor ? (
            <>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Signing up as</h2>
              <p className="text-sm text-[#1A1A1A]">
                <span className="font-medium">{actor.name}</span>
                <span className="text-[#5A6070]"> · {actor.email}</span>
              </p>
              <p className="text-xs text-[#5A6070]">From your Staff profile — no extra form needed.</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Sign in to claim</h2>
              <p className="text-sm text-[#5A6070]">
                Anyone can see open nights and who already signed up. To claim a slot, sign in with your
                board email so we use your Staff name and address.
              </p>
              <Button type="button" asChild>
                <a href={signInHref}>Sign in with Google</a>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Your info</h2>
          {fields.map((field) => {
            if (field.fieldKey === 'name') {
              return (
                <label key={field.id} className="block text-sm">
                  <span className="font-medium">{field.label}</span>
                  <input
                    required={field.required}
                    className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )
            }
            if (field.fieldKey === 'email') {
              return (
                <label key={field.id} className="block text-sm">
                  <span className="font-medium">{field.label}</span>
                  <input
                    type="email"
                    required={field.required}
                    className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )
            }
            if (field.fieldKey === 'phone') {
              return (
                <label key={field.id} className="block text-sm">
                  <span className="font-medium">{field.label}</span>
                  <input
                    type="tel"
                    required={field.required}
                    className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              )
            }
            return null
          })}
        </div>
      )}

      {extraFields.length > 0 ? (
        <div className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">More details</h2>
          {extraFields.map((field) => (
            <label key={field.id} className="block text-sm">
              <span className="font-medium">{field.label}</span>
              {field.fieldType === 'textarea' ? (
                <textarea
                  required={field.required}
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2 min-h-[72px]"
                  value={custom[field.fieldKey] || ''}
                  onChange={(e) => setCustom({ ...custom, [field.fieldKey]: e.target.value })}
                />
              ) : (
                <input
                  required={field.required}
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E5E2DC)] px-3 py-2"
                  value={custom[field.fieldKey] || ''}
                  onChange={(e) => setCustom({ ...custom, [field.fieldKey]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-[#FFF1F0] px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={busy || Object.keys(selected).length === 0 || (useStaffIdentity && !signedIn)}
      >
        {busy ? 'Signing up…' : 'Confirm sign-up'}
      </Button>
    </form>
  )
}
