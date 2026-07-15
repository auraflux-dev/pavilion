'use client'

import { useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PortalCopy } from '@/lib/defaults/portal-copy'

type FormLabels = Pick<
  PortalCopy,
  | 'addStudentCta'
  | 'addStudentTitle'
  | 'firstNameLabel'
  | 'lastNameLabel'
  | 'gradeLabel'
  | 'addStudentSubmit'
  | 'cancel'
  | 'addStudentError'
>

interface Props {
  onAdded: (student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    membershipTier: string
    membershipStatus: string
    discountCode: string | null
    storeCardBalance: number
  }) => void
  grades?: string[]
  labels: FormLabels
}

export function AddStudentForm({ onAdded, grades = ['6', '7', '8'], labels }: Props) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !grade) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, grade }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { student } = await res.json()
      onAdded(student)
      setFirstName('')
      setLastName('')
      setGrade('')
      setOpen(false)
    } catch {
      setError(labels.addStudentError)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3.5 rounded-xl border-2 border-dashed transition-colors hover:border-[#085508] hover:bg-[#EEF6EE] text-[#5A6070] hover:text-[#085508]"
        style={{ borderColor: '#D4D4D4' }}
      >
        <UserPlus className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold">{labels.addStudentCta}</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DC] p-5 shadow-sm">
      <h3 className="font-bold text-[#1A1A1A] mb-4">{labels.addStudentTitle}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5A6070] mb-1">
              {labels.firstNameLabel}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={labels.firstNameLabel}
              required
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085508]/30 focus:border-[#085508]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A6070] mb-1">
              {labels.lastNameLabel}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={labels.lastNameLabel}
              required
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085508]/30 focus:border-[#085508]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5A6070] mb-1">
            {labels.gradeLabel}
          </label>
          <div className="flex gap-2">
            {grades.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                  grade === g
                    ? 'text-white border-transparent'
                    : 'bg-white text-[#5A6070] border-[#E8E4DC] hover:border-[#085508]'
                }`}
                style={
                  grade === g
                    ? { backgroundColor: '#085508', borderColor: '#085508' }
                    : {}
                }
              >
                {g}th
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={saving || !firstName.trim() || !lastName.trim() || !grade}
            className="flex-1 font-semibold text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.addStudentSubmit}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            {labels.cancel}
          </Button>
        </div>
      </form>
    </div>
  )
}
