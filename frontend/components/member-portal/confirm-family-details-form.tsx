'use client'

import { useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

type StudentSeed = {
  parentFirstName?: string
  parentLastName?: string
  parentPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  pickupAuthorized?: string
}

type MemberSeed = {
  name?: string
  firstName?: string
  lastName?: string
  phone?: string
}

type Props = {
  students: StudentSeed[]
  member?: MemberSeed | null
  onConfirmed: (payload: {
    students: unknown[]
    member?: { name: string; firstName: string; lastName: string; phone: string }
  }) => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30'

function splitName(name: string | undefined): { first: string; last: string } {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export function ConfirmFamilyDetailsForm({ students, member, onConfirmed }: Props) {
  const seed = useMemo(() => {
    const fromStudent = students[0]
    const fromMember = splitName(member?.name)
    return {
      parentFirstName:
        String(fromStudent?.parentFirstName ?? member?.firstName ?? fromMember.first).trim(),
      parentLastName:
        String(fromStudent?.parentLastName ?? member?.lastName ?? fromMember.last).trim(),
      parentPhone: String(fromStudent?.parentPhone ?? member?.phone ?? '').trim(),
      emergencyContact: String(fromStudent?.emergencyContact ?? '').trim(),
      emergencyPhone: String(fromStudent?.emergencyPhone ?? '').trim(),
      pickupAuthorized: String(fromStudent?.pickupAuthorized ?? '').trim(),
    }
  }, [students, member])

  const [parentFirstName, setParentFirstName] = useState(seed.parentFirstName)
  const [parentLastName, setParentLastName] = useState(seed.parentLastName)
  const [parentPhone, setParentPhone] = useState(seed.parentPhone)
  const [emergencyContact, setEmergencyContact] = useState(seed.emergencyContact)
  const [emergencyPhone, setEmergencyPhone] = useState(seed.emergencyPhone)
  const [pickupAuthorized, setPickupAuthorized] = useState(seed.pickupAuthorized)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/portal/confirm-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentFirstName,
          parentLastName,
          parentPhone,
          emergencyContact,
          emergencyPhone,
          pickupAuthorized,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      onConfirmed({ students: data.students ?? [], member: data.member })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      id="portal-confirm-family"
      className="rounded-xl border border-[#F0D9A0] bg-[#FFF7E6] px-4 py-4 mb-6 space-y-3"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#8A6400]" aria-hidden />
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]">Confirm your family details</p>
          <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">
            {students.length > 0
              ? vanillaizeIfDemo(
                  `We found ${students.length} student${students.length === 1 ? '' : 's'} on your account. Confirm or update the details below once. This unlocks the Cove Digital Card for your family.`,
                )
              : vanillaizeIfDemo(
                  'Add a student first, then confirm these details to unlock Cove.',
                )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5 bg-white/70 rounded-lg border border-[#F0EDE8] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070]">
          Parent / guardian
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={parentFirstName}
            onChange={(e) => setParentFirstName(e.target.value)}
            placeholder="First name"
            required
            className={inputCls}
            autoComplete="given-name"
          />
          <input
            value={parentLastName}
            onChange={(e) => setParentLastName(e.target.value)}
            placeholder="Last name"
            required
            className={inputCls}
            autoComplete="family-name"
          />
        </div>
        <input
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          placeholder="Parent phone"
          required
          className={inputCls}
          autoComplete="tel"
        />

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070] pt-1">
          Emergency & pick-up (applies to all students)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="Emergency contact name"
            required
            className={inputCls}
          />
          <input
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="Emergency phone"
            required
            className={inputCls}
          />
        </div>
        <input
          value={pickupAuthorized}
          onChange={(e) => setPickupAuthorized(e.target.value)}
          placeholder="Who may pick up (names)"
          required
          className={inputCls}
        />

        {error ? <p className="text-xs text-red-700">{error}</p> : null}

        <Button
          type="submit"
          disabled={saving || students.length === 0}
          className="w-full text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            vanillaizeIfDemo('Confirm and unlock Cove')
          )}
        </Button>
      </form>
    </section>
  )
}
