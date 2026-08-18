'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { trackGenerateLead } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

const TOPICS = [
  'General Question',
  'Programs & Registration',
  vanillaizeIfDemo('The Cove / Cove Digital Card'),
  'Volunteer Opportunities',
  'Membership',
  'Fundraising',
  'Event Information',
  'Board / Governance',
  'Other',
]

interface FormState {
  name: string
  email: string
  topic: string
  message: string
}

export function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', topic: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      trackGenerateLead({ formId: 'contact', leadType: form.topic || 'contact' })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--brand-green)' }} />
        </div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Message sent!</h3>
        <p className="text-[#5A6070] text-sm max-w-xs mx-auto">
          Thank you for reaching out. A PTO board member will get back to you within one business day.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm space-y-5">
      <h2 className="text-xl font-bold text-[#1A1A1A]">Send us a message</h2>

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={form.name}
            onChange={update('name')}
            placeholder="Jane Smith"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="yourname@email.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
          />
        </div>
      </div>

      {/* Topic */}
      <div>
        <label htmlFor="contact-topic" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Topic <span className="text-red-500">*</span>
        </label>
        <select
          id="contact-topic"
          required
          value={form.topic}
          onChange={update('topic')}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors bg-white"
        >
          <option value="" disabled>Select a topic…</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={update('message')}
          placeholder="How can we help?"
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">Something went wrong. Please try again or email us directly.</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={status === 'loading'}
        className="w-full font-bold text-white group"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
        ) : (
          <>Send Message <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>
        )}
      </Button>

      <p className="text-xs text-[#5A6070] text-center">
        We respond within one business day during the school year.
      </p>
    </form>
  )
}
