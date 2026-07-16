'use client'

import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  discountCode: string | null
  storeCardBalance: number
}

interface Props {
  student: Student
  grades: string[]
  onUpdated: (student: Student) => void
}

export function EditStudentForm({ student, grades, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(student.firstName)
  const [lastName, setLastName] = useState(student.lastName)
  const [grade, setGrade] = useState(student.grade)
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
        body: JSON.stringify({ firstName, lastName, grade }),
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
        className="text-xs font-semibold text-[#085508] hover:underline inline-flex items-center gap-1"
      >
        <Pencil className="w-3 h-3" /> Edit student
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          required
          className="px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          required
          className="px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg"
        />
      </div>
      <div className="flex gap-2">
        {grades.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 ${
              grade === g ? 'text-white border-transparent' : 'border-[#E8E4DC] text-[#5A6070]'
            }`}
            style={grade === g ? { backgroundColor: '#085508' } : undefined}
          >
            {g}th
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="text-white text-xs" style={{ backgroundColor: '#085508' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
        <Button type="button" variant="outline" className="text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
