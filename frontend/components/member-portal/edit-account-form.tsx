'use client'

import { useState } from 'react'
import { Pencil, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  initialName: string
  email: string
  phone?: string
  onUpdated: (name: string) => void
}

export function EditAccountForm({ initialName, email, phone = '', onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const parts = initialName.split(' ')
  const [firstName, setFirstName] = useState(parts[0] ?? '')
  const [lastName, setLastName] = useState(parts.slice(1).join(' ') || '')
  const [phoneVal, setPhoneVal] = useState(phone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone: phoneVal }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      onUpdated(data.member.name)
      setSaved(true)
      setOpen(false)
      setTimeout(() => setSaved(false), 2000)
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
        className="inline-flex items-center gap-1 text-xs font-bold text-[#085508] hover:underline"
      >
        <Pencil className="w-3 h-3" />
        Edit profile
        {saved && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#E8E4DC] p-4 mb-4 bg-[#FAFCF9] space-y-3">
      <p className="text-sm font-bold text-[#1A1A1A]">Edit your profile</p>
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
      <input
        type="tel"
        value={phoneVal}
        onChange={(e) => setPhoneVal(e.target.value)}
        placeholder="Mobile phone (optional)"
        className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg"
      />
      <p className="text-[11px] text-[#5A6070]">Sign-in email: {email} (contact the PTO to change)</p>
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
