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
  /** Parent dashboard banner after a successful save. */
  onSaved?: (message: string) => void
  /** When true, only the form (no trigger button). Parent owns the Edit control. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide the built-in Edit trigger (use when parent renders it in the card header). */
  hideTrigger?: boolean
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30'

export function EditStudentForm({
  student,
  grades,
  onUpdated,
  onSaved,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (openProp === undefined) setUncontrolledOpen(next)
  }
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
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter first and last name.')
      return
    }
    if (!grade) {
      setError('Select a grade.')
      return
    }
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Could not save. Please try again.',
        )
      }
      if (!data.student) {
        throw new Error('Save did not return updated student. Please refresh and try again.')
      }
      onUpdated(data.student)
      onSaved?.(`${firstName.trim()} ${lastName.trim()}'s profile was saved.`)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    if (hideTrigger) return null
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

  const labelCls = 'block text-xs font-semibold text-[#5A6070] mb-1'

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-xl border border-[var(--border)] bg-[#FAFCF9] space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor={`edit-student-first-${student.id}`}>
            First name
          </label>
          <input
            id={`edit-student-first-${student.id}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`edit-student-last-${student.id}`}>
            Last name
          </label>
          <input
            id={`edit-student-last-${student.id}`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <p className={labelCls}>Grade</p>
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
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070] pt-1">
        Safety & pick-up (required for enrichment)
      </p>
      {!(parentPhone.trim() && emergencyContact.trim() && emergencyPhone.trim() && pickupAuthorized.trim()) ? (
        <p className="text-xs font-semibold text-amber-800">
          Safety profile incomplete. Fill the fields below.
        </p>
      ) : allergies.trim() ? (
        <p className="text-xs text-[#5A6070]">Allergy: {allergies.trim()}</p>
      ) : null}
      <div>
        <label className={labelCls} htmlFor={`edit-student-phone-${student.id}`}>
          Parent phone
        </label>
        <input
          id={`edit-student-phone-${student.id}`}
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-secondary-${student.id}`}>
          Secondary phone (optional)
        </label>
        <input
          id={`edit-student-secondary-${student.id}`}
          value={secondaryPhone}
          onChange={(e) => setSecondaryPhone(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor={`edit-student-ec-name-${student.id}`}>
            Emergency contact name
          </label>
          <input
            id={`edit-student-ec-name-${student.id}`}
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`edit-student-ec-phone-${student.id}`}>
            Emergency phone
          </label>
          <input
            id={`edit-student-ec-phone-${student.id}`}
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-allergies-${student.id}`}>
          Allergies
        </label>
        <input
          id={`edit-student-allergies-${student.id}`}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. EpiPen"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-medical-${student.id}`}>
          Medical conditions / accommodations
        </label>
        <input
          id={`edit-student-medical-${student.id}`}
          value={medicalConditions}
          onChange={(e) => setMedicalConditions(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-meds-${student.id}`}>
          Medications (optional)
        </label>
        <input
          id={`edit-student-meds-${student.id}`}
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-pickup-${student.id}`}>
          Authorized pick-up list
        </label>
        <textarea
          id={`edit-student-pickup-${student.id}`}
          value={pickupAuthorized}
          onChange={(e) => setPickupAuthorized(e.target.value)}
          placeholder="Names of people who may pick up"
          rows={2}
          className={inputCls}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
        <input
          type="checkbox"
          checked={selfRelease}
          onChange={(e) => setSelfRelease(e.target.checked)}
        />
        Allow self-release after class (7th/8th, if program permits)
      </label>

      {error ? <p role="alert" className="text-xs font-medium text-red-700">{error}</p> : null}
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
