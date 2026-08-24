'use client'

import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormString } from '@/components/member-portal/portal-form-copy-context'

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
  const t = useFormString
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
      setError(t('editStudent.errorNames'))
      return
    }
    if (!grade) {
      setError(t('editStudent.errorGrade'))
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
          typeof data.error === 'string' ? data.error : t('editStudent.errorSave'),
        )
      }
      if (!data.student) {
        throw new Error(t('editStudent.errorNoStudent'))
      }
      onUpdated(data.student)
      onSaved?.(`${firstName.trim()} ${lastName.trim()}'s profile was saved.`)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editStudent.errorSave'))
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
        <Pencil className="w-3 h-3" /> {t('editStudent.trigger')}
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
            {t('editStudent.firstName')}
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
            {t('editStudent.lastName')}
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
        <p className={labelCls}>{t('editStudent.grade')}</p>
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
        {t('editStudent.safetyHeading')}
      </p>
      {!(parentPhone.trim() && emergencyContact.trim() && emergencyPhone.trim() && pickupAuthorized.trim()) ? (
        <p className="text-xs font-semibold text-amber-800">
          {t('editStudent.safetyIncomplete')}
        </p>
      ) : allergies.trim() ? (
        <p className="text-xs text-[#5A6070]">{t('editStudent.allergyPrefix')} {allergies.trim()}</p>
      ) : null}
      <div>
        <label className={labelCls} htmlFor={`edit-student-phone-${student.id}`}>
          {t('editStudent.parentPhone')}
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
          {t('editStudent.secondaryPhone')}
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
            {t('editStudent.emergencyContact')}
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
            {t('editStudent.emergencyPhone')}
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
          {t('editStudent.allergies')}
        </label>
        <input
          id={`edit-student-allergies-${student.id}`}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder={t('editStudent.allergiesPlaceholder')}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`edit-student-medical-${student.id}`}>
          {t('editStudent.medical')}
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
          {t('editStudent.medications')}
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
          {t('editStudent.pickup')}
        </label>
        <textarea
          id={`edit-student-pickup-${student.id}`}
          value={pickupAuthorized}
          onChange={(e) => setPickupAuthorized(e.target.value)}
          placeholder={t('editStudent.pickupPlaceholder')}
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
        {t('editStudent.selfRelease')}
      </label>

      {error ? <p role="alert" className="text-xs font-medium text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving}
          className="text-white text-xs"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('editStudent.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-xs"
          onClick={() => setOpen(false)}
        >
          {t('editStudent.cancel')}
        </Button>
      </div>
    </form>
  )
}
