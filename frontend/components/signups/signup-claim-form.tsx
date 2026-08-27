'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { SignupSheetField, SignupSlot } from '@/lib/signups/types'

type PublicSlot = SignupSlot & { quantityRemaining?: number }

type Props = {
  slug: string
  fields: SignupSheetField[]
  slots: PublicSlot[]
}

export function SignupClaimForm({ slug, fields, slots }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remainingById = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of slots) {
      m.set(s.id, s.quantityRemaining ?? Math.max(0, s.quantityNeeded - s.quantityClaimed))
    }
    return m
  }, [slots])

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
      const slotsPayload = Object.entries(selected).map(([slotId, quantity]) => ({
        slotId,
        quantity,
      }))
      const r = await fetch(`/api/signups/${encodeURIComponent(slug)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, customAnswers: custom, slots: slotsPayload }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sign-up failed')
      router.push(d.confirmPath || `/signups/${slug}/confirm?token=${d.confirmationToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Pick slots</h2>
        {slots.map((slot) => {
          const remaining = remainingById.get(slot.id) ?? 0
          const full = remaining <= 0
          const checked = Boolean(selected[slot.id])
          return (
            <label
              key={slot.id}
              className={`flex gap-3 rounded-xl border p-4 ${
                full ? 'opacity-50 border-[var(--border,#E5E2DC)]' : 'border-[var(--border,#E5E2DC)] bg-white'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={full}
                checked={checked}
                onChange={() => toggleSlot(slot.id)}
              />
              <span className="flex-1">
                <span className="font-medium text-[#1A1A1A] block">{slot.title}</span>
                {slot.description ? (
                  <span className="text-sm text-[#5A6070] block mt-1">{slot.description}</span>
                ) : null}
                <span className="text-xs text-[#5A6070] block mt-1">
                  {full ? 'Full' : `${remaining} open`}
                  {slot.itemUnit ? ` · ${slot.itemUnit}` : ''}
                </span>
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
      </div>

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
          return (
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
          )
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-[#FFF1F0] px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={busy || Object.keys(selected).length === 0}>
        {busy ? 'Signing up…' : 'Confirm sign-up'}
      </Button>
    </form>
  )
}
