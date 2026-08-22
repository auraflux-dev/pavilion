'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { trackGenerateLead } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { useAuth } from '@/lib/hooks/use-auth'

const DRAFT_KEY = 'volunteer-form-draft-v1'

/** Used only when VolunteerOpportunities CMS returns no active rows */
const FALLBACK_OPPORTUNITIES = [
  'School Store Window',
  'Event Setup / Breakdown',
  'Enrichment Program Chaperone',
  'Fundraiser Support',
  'Dance Night',
  'NOVA Math Tournament',
  'General Volunteering',
]

type VolunteerFormProps = {
  /** Titles from Wix VolunteerOpportunities (active, sorted) */
  opportunities?: string[]
}

export function VolunteerForm({ opportunities }: VolunteerFormProps) {
  const { status: authStatus } = useAuth()
  const options = useMemo(() => {
    const raw =
      opportunities && opportunities.length > 0 ? opportunities : FALLBACK_OPPORTUNITIES
    return raw.map((title) => vanillaizeIfDemo(title))
  }, [opportunities])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    opportunity: '',
    notes: '',
  })

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as typeof form
      if (parsed && typeof parsed === 'object') setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      /* ignore */
    }
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const next = { ...form, [e.target.name]: e.target.value }
    setForm(next)
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      trackGenerateLead({ formId: 'volunteer', leadType: form.opportunity || 'volunteer' })
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--brand-green)' }} />
        </div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Thank you for signing up!</h3>
        <p className="text-[#5A6070] text-sm">
          {vanillaizeIfDemo(
            "We'll be in touch soon with next steps. We appreciate your support of SHMS PTO students.",
          )}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm space-y-5">
      <h3 className="text-xl font-bold text-[#1A1A1A]">Sign Up to Volunteer</h3>
      {authStatus === 'visitor' ? (
        <p className="text-sm text-[#5A6070] whitespace-pre-line rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-3">
          {vanillaizeIfDemo(
            'You need a free account to submit.\nYour answers stay saved on this device when you continue to sign in.',
          )}
        </p>
      ) : null}

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
            placeholder="Jane"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
            placeholder="Smith"
          />
        </div>
      </div>

      {/* Email + phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
            placeholder="jane@email.com"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
            placeholder="(703) 555-0100"
          />
        </div>
      </div>

      {/* Opportunity */}
      <div>
        <label htmlFor="opportunity" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          I&apos;d like to help with <span className="text-red-500">*</span>
        </label>
        <select
          id="opportunity"
          name="opportunity"
          required
          value={form.opportunity}
          onChange={handleChange}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors bg-white"
        >
          <option value="">Select an opportunity…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Anything else we should know?
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={form.notes}
          onChange={handleChange}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors resize-none"
          placeholder="Availability, questions, preferences…"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">
          Something went wrong. Please try again or email us directly.
        </p>
      )}

      <MemberGate label="Sign up to volunteer">
        <Button
          type="submit"
          size="lg"
          disabled={status === 'loading'}
          className="w-full font-bold text-white group"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Sign Up to Volunteer
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </Button>
      </MemberGate>
    </form>
  )
}
