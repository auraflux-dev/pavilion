'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { trackGenerateLead } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { sponsorshipPackageSelectOptions } from '@/lib/sponsorships'

type Variant = 'programs' | 'events' | 'sponsorship'

type Props = {
  /** Destination inbox (CMS contactEmail*) */
  toEmail: string
  variant: Variant
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

const COPY: Record<
  Variant,
  {
    department: string
    topic: string
    eyebrow: string
    title: string
    intro: string
    optionalLabel: string
    optionalPlaceholder: string
    messagePlaceholder: string
    submitLabel: string
    successBody: string
  }
> = {
  programs: {
    department: 'programs',
    topic: 'Programs & Registration',
    eyebrow: 'Co-VP Fundraising & Programs',
    title: 'Ask about a program',
    intro: 'Questions go to',
    optionalLabel: 'Program name',
    optionalPlaceholder: isPublicDemoInstance()
      ? 'e.g. Chess, Science Lab, Creative Writing'
      : 'e.g. Robotics Foundations & Coding Mechanics, Competitive Math Prep, Young Entrepreneurs, Essay Writing',
    messagePlaceholder: 'What would you like to know?',
    submitLabel: 'Send question',
    successBody:
      'Thanks. Co-VP Fundraising & Programs will follow up within one business day during the school year.',
  },
  events: {
    department: 'events',
    topic: 'Event idea',
    eyebrow: 'VP of Events',
    title: 'Share an event idea',
    intro: 'Ideas go to',
    optionalLabel: 'Event name or theme',
    optionalPlaceholder: isPublicDemoInstance()
      ? 'e.g. Spring Carnival, Book Fair Night, Field Day'
      : 'e.g. Family Fun Night, Dance Night theme',
    messagePlaceholder: 'Tell us your idea, preferred timing, and how you might help.',
    submitLabel: 'Send to VP of Events',
    successBody:
      'Thanks. Our VP of Events will review your idea and follow up within one business day during the school year.',
  },
  sponsorship: {
    department: 'sponsorship',
    topic: 'Sponsorship inquiry',
    eyebrow: 'VP of Sponsorships',
    title: 'Become a sponsor',
    intro: 'Sponsorship requests go to',
    optionalLabel: 'Business or organization',
    optionalPlaceholder: 'e.g. Local restaurant, family business',
    messagePlaceholder:
      vanillaizeIfDemo(
        'Tell us about your business, how you would like to support SHMS PTO, and the best way to reach you.',
      ),
    submitLabel: 'Send sponsorship request',
    successBody:
      'Thanks. Our VP of Sponsorships and the president will review your interest and follow up soon.',
  },
}

export function DepartmentContactForm({ toEmail, variant }: Props) {
  const copy = COPY[variant]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [optional, setOptional] = useState('')
  const [packageChoice, setPackageChoice] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const prefix =
        variant === 'programs'
          ? 'Program'
          : variant === 'events'
            ? 'Event idea'
            : 'Organization'
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          topic: copy.topic,
          message: [
            optional.trim() ? `${prefix}: ${optional.trim()}` : '',
            variant === 'sponsorship' && packageChoice ? `Package: ${packageChoice}` : '',
            message,
          ]
            .filter(Boolean)
            .join('\n\n'),
          department: copy.department,
          assignedTo: toEmail,
        }),
      })
      if (!res.ok) throw new Error()
      trackGenerateLead({ formId: `contact_${variant}`, leadType: copy.topic })
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
        <h3 className="mb-2 text-xl font-bold text-[#1A1A1A]">Message sent</h3>
        <p className="text-sm text-[#5A6070]">{copy.successBody}</p>
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
          {copy.eyebrow}
        </p>
        <h3 className="mt-1 text-xl font-bold text-[#1A1A1A]">{copy.title}</h3>
        <p className="mt-1 text-sm text-[#5A6070]">
          {copy.intro} {formatInboxList(toEmail)}. We usually reply within one business day.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Your name <span className="text-red-500">*</span>
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
            Email <span className="text-red-500">*</span>
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
          {copy.optionalLabel} <span className="text-[#5A6070]">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-optional`}
          type="text"
          value={optional}
          onChange={(e) => setOptional(e.target.value)}
          placeholder={copy.optionalPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
        />
      </div>

      {variant === 'sponsorship' ? (
        <div>
          <label htmlFor={`${idPrefix}-package`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Package of interest <span className="text-[#5A6070]">(optional)</span>
          </label>
          <select
            id={`${idPrefix}-package`}
            value={packageChoice}
            onChange={(e) => setPackageChoice(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm bg-white focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
          >
            <option value="">Not sure yet</option>
            {sponsorshipPackageSelectOptions(isPublicDemoInstance()).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor={`${idPrefix}-message`} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`${idPrefix}-message`}
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.messagePlaceholder}
          className="w-full resize-none rounded-lg border border-[var(--border)] px-3.5 py-2.5 text-sm focus:border-[var(--brand-green)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20"
        />
      </div>

      {status === 'error' ? (
        <p className="text-sm text-red-600">
          Something went wrong. Please try again or email{' '}
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            {copy.submitLabel}
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
