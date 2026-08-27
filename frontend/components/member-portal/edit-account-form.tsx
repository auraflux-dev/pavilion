'use client'

import { useState } from 'react'
import { Pencil, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormString } from '@/components/member-portal/portal-form-copy-context'
import { interpolateCopy } from '@/lib/api/portal-form-copy-shared'

interface Props {
  initialName: string
  email: string
  phone?: string
  onUpdated: (payload: { name: string; phone?: string }) => void
  onSaved?: (message: string) => void
}

export function EditAccountForm({ initialName, email, phone = '', onUpdated, onSaved }: Props) {
  const t = useFormString
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t('editProfile.errorSave'))
      }
      onUpdated({ name: data.member.name, phone: data.member.phone ?? phoneVal })
      onSaved?.(t('editProfile.successBanner'))
      setSaved(true)
      setOpen(false)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editProfile.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-green)] hover:underline"
      >
        <Pencil className="w-3 h-3" />
        {t('editProfile.cta')}
        {saved ? (
          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
            {t('editProfile.saved')}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-[var(--border)] p-4 mb-4 bg-[#FAFCF9] space-y-3">
      <p className="text-sm font-bold text-[#1A1A1A]">{t('editProfile.title')}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t('editProfile.firstName')}
          required
          className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t('editProfile.lastName')}
          required
          className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg"
        />
      </div>
      <input
        type="tel"
        value={phoneVal}
        onChange={(e) => setPhoneVal(e.target.value)}
        placeholder={t('editProfile.phone')}
        inputMode="tel"
        autoComplete="tel"
        className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg"
      />
      <p className="text-[11px] text-[#5A6070]">
        {interpolateCopy(t('editProfile.emailHint'), { email })}
      </p>
      {error ? <p role="alert" className="text-xs font-medium text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="text-white text-xs" style={{ backgroundColor: 'var(--brand-green)' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('editProfile.save')}
        </Button>
        <Button type="button" variant="outline" className="text-xs" onClick={() => setOpen(false)}>
          {t('editProfile.cancel')}
        </Button>
      </div>
    </form>
  )
}
