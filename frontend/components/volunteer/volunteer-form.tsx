'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'

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
  const options =
    opportunities && opportunities.length > 0
      ? opportunities
      : FALLBACK_OPPORTUNITIES

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    opportunity: '',
    notes: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
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
          style={{ backgroundColor: '#EEF6EE' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: '#085508' }} />
        </div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Thank you for signing up!</h3>
        <p className="text-[#5A6070] text-sm">
          We&apos;ll be in touch soon with next steps. We appreciate your support of SHMS students.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm space-y-5">
      <h3 className="text-xl font-bold text-[#1A1A1A]">Sign Up to Volunteer</h3>

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
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors"
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors"
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors"
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors"
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
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors bg-white"
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
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors resize-none"
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
          style={{ backgroundColor: '#085508' }}
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
