'use client'

import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  discountCode: string | null
  storeCardBalance: number
  parentPhone?: string
  secondaryPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string
  medicalConditions?: string
  medications?: string
  pickupAuthorized?: string
  selfRelease?: boolean
  photoMediaConsent?: boolean | null
}

interface Props {
  student: Student
  grades: string[]
  onUpdated: (student: Student) => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30'

export function EditStudentForm({ student, grades, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(student.firstName)
  const [lastName, setLastName] = useState(student.lastName)
  const [grade, setGrade] = useState(student.grade)
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? '')
  const [secondaryPhone, setSecondaryPhone] = useState(student.secondaryPhone ?? '')
  const [emergencyContact, setEmergencyContact] = useState(student.emergencyContact ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(student.emergencyPhone ?? '')
  const [allergies, setAllergies] = useState(student.allergies ?? '')
  const [medicalConditions, setMedicalConditions] = useState(student.medicalConditions ?? '')
  const [medications, setMedications] = useState(student.medications ?? '')
  const [pickupAuthorized, setPickupAuthorized] = useState(student.pickupAuthorized ?? '')
  const [selfRelease, setSelfRelease] = useState(Boolean(student.selfRelease))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          grade,
          parentPhone,
          secondaryPhone,
          emergencyContact,
          emergencyPhone,
          allergies,
          medicalConditions,
          medications,
          pickupAuthorized,
          selfRelease,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      const { student: updated } = await res.json()
      onUpdated(updated)
      setOpen(false)
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-[var(--brand-green)] hover:underline inline-flex items-center gap-1"
      >
        <Pencil className="w-3 h-3" /> Edit student
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-xl border border-[var(--border)] bg-[#FAFCF9] space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          required
          className={inputCls}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          required
          className={inputCls}
        />
      </div>
      <div className="flex gap-2">
        {grades.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 ${
              grade === g ? 'text-white border-transparent' : 'border-[var(--border)] text-[#5A6070]'
            }`}
            style={grade === g ? { backgroundColor: 'var(--brand-green)' } : undefined}
          >
            {g}th
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070] pt-1">
        Safety & pick-up (required for enrichment)
      </p>
      <input
        value={parentPhone}
        onChange={(e) => setParentPhone(e.target.value)}
        placeholder="Parent phone"
        className={inputCls}
      />
      <input
        value={secondaryPhone}
        onChange={(e) => setSecondaryPhone(e.target.value)}
        placeholder="Secondary phone (optional)"
        className={inputCls}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          placeholder="Emergency contact name"
          className={inputCls}
        />
        <input
          value={emergencyPhone}
          onChange={(e) => setEmergencyPhone(e.target.value)}
          placeholder="Emergency phone"
          className={inputCls}
        />
      </div>
      <input
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        placeholder="Allergies (e.g. EpiPen)"
        className={inputCls}
      />
      <input
        value={medicalConditions}
        onChange={(e) => setMedicalConditions(e.target.value)}
        placeholder="Medical conditions / accommodations"
        className={inputCls}
      />
      <input
        value={medications}
        onChange={(e) => setMedications(e.target.value)}
        placeholder="Medications (optional)"
        className={inputCls}
      />
      <textarea
        value={pickupAuthorized}
        onChange={(e) => setPickupAuthorized(e.target.value)}
        placeholder="Authorized pick-up list (names)"
        rows={2}
        className={inputCls}
      />
      <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
        <input
          type="checkbox"
          checked={selfRelease}
          onChange={(e) => setSelfRelease(e.target.checked)}
        />
        Allow self-release after class (7th/8th, if program permits)
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving}
          className="text-white text-xs"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
