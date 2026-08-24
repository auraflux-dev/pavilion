'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { trackGenerateLead } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { useProgramUiCopy, ui } from '@/components/programs/program-ui-copy-context'

type Variant = 'programs' | 'events' | 'sponsorship'

type Props = {
  /** Destination inbox (CMS contactEmail*) */
  toEmail: string
  variant: Variant
}

const VARIANT_PREFIX: Record<Variant, string> = {
  programs: 'contact.programs',
  events: 'contact.events',
  sponsorship: 'contact.sponsorship',
}

const VARIANT_META: Record<Variant, { department: string; topic: string; messagePrefix: string }> = {
  programs: { department: 'programs', topic: 'Programs & Registration', messagePrefix: 'Program' },
  events: { department: 'events', topic: 'Event idea', messagePrefix: 'Event idea' },
  sponsorship: { department: 'sponsorship', topic: 'Sponsorship inquiry', messagePrefix: 'Organization' },
}

function formatInboxList(raw: string): string {
  const parts = String(raw ?? '')
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length <= 1) return parts[0] || raw
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

export function DepartmentContactForm({ toEmail, variant }: Props) {
  const uiCopy = useProgramUiCopy()
  const prefix = VARIANT_PREFIX[variant]
  const meta = VARIANT_META[variant]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [optional, setOptional] = useState('')
  const [packageChoice, setPackageChoice] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const messagePlaceholder =
    variant === 'sponsorship'
      ? vanillaizeIfDemo(ui(uiCopy, `${prefix}.messagePlaceholder`))
      : ui(uiCopy, `${prefix}.messagePlaceholder`)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          topic: meta.topic,
          message: [
            optional.trim() ? `${meta.messagePrefix}: ${optional.trim()}` : '',
            variant === 'sponsorship' && packageChoice ? `Package: ${packageChoice}` : '',
            message,
          ]
            .filter(Boolean)
            .join('\n\n'),
          department: meta.department,
          assignedTo: toEmail,
        }),
      })
      if (!res.ok) throw new Error()
      trackGenerateLead({ formId: `contact_${variant}`, leadType: meta.topic })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#1A1A1A]">
          {ui(uiCopy, 'contact.successTitle')}
        </h3>
        <p className="text-sm text-[#5A6070]">{ui(uiCopy, `${prefix}.success`)}</p>
      </div>
    )
  }

  const idPrefix = `dept-${variant}`

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="text-left">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand-green)' }}>
          {ui(uiCopy, `${prefix}.eyebrow`)}
        </p>
        <h3 className="mt-1 text-xl font-bold text-[#1A1A1A]">{ui(uiCopy, `${prefix}.title`)}</h3>
        <p className="mt-1 text-sm text-[#5A6070]">
          {ui(uiCopy, `${prefix}.intro`)} {formatInboxList(toEmail)}.{' '}
          {ui(uiCopy, 'contact.introSuffix')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            {ui(uiCopy, 'contact.nameLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-email`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            {ui(uiCopy, 'contact.emailLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-optional`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          {ui(uiCopy, `${prefix}.optionalLabel`)}{' '}
          <span className="text-[#5A6070]">{ui(uiCopy, 'contact.optionalSuffix')}</span>
        </label>
        <input
          id={`${idPrefix}-optional`}
          type="text"
          value={optional}
          onChange={(e) => setOptional(e.target.value)}
          placeholder={ui(uiCopy, `${prefix}.optionalPlaceholder`)}
          className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
        />
      </div>

      {variant === 'sponsorship' ? (
        <div>
          <label htmlFor={`${idPrefix}-package`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            {ui(uiCopy, 'contact.packageLabel')}{' '}
            <span className="text-[#5A6070]">{ui(uiCopy, 'contact.optionalSuffix')}</span>
          </label>
          <select
            id={`${idPrefix}-package`}
            value={packageChoice}
            onChange={(e) => setPackageChoice(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm bg-white focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
          >
            <option value="">{ui(uiCopy, 'contact.packageNotSure')}</option>
            <option value="Platinum: $2,500">Platinum: $2,500</option>
            <option value="Gold: $1,500">Gold: $1,500</option>
            <option value="Silver: $500">Silver: $500</option>
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor={`${idPrefix}-message`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          {ui(uiCopy, 'contact.messageLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`${idPrefix}-message`}
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={messagePlaceholder}
          className="w-full resize-none rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
        />
      </div>

      {status === 'error' ? (
        <p className="text-sm text-red-600">
          {ui(uiCopy, 'contact.err.failed')}{' '}
          <a href={`mailto:${toEmail}`} className="underline">
            {toEmail}
          </a>
          .
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={status === 'loading'}
        className="w-full font-bold text-white"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {ui(uiCopy, 'contact.sending')}
          </>
        ) : (
          <>
            {ui(uiCopy, `${prefix}.submit`)}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  )
}

/** @deprecated Prefer DepartmentContactForm variant="programs" */
export function ProgramsContactForm({ toEmail }: { toEmail: string }) {
  return <DepartmentContactForm toEmail={toEmail} variant="programs" />
}
