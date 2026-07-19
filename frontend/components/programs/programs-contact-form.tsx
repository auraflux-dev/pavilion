'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

type Props = {
  /** Destination inbox for VP of Programs (CMS: contactEmailPrograms) */
  toEmail: string
}

export function ProgramsContactForm({ toEmail }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [programName, setProgramName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

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
          topic: 'Programs & Registration',
          message: programName.trim()
            ? `Program: ${programName.trim()}\n\n${message}`
            : message,
          department: 'programs',
          assignedTo: toEmail,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E8E4DC] bg-white p-8 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: '#EEF6EE' }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: '#085508' }} aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#1A1A1A]">Message sent</h3>
        <p className="text-sm text-[#5A6070]">
          Thanks — our VP of Programs will get back to you within one business day
          during the school year.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="text-left">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#085508' }}>
          VP of Programs
        </p>
        <h3 className="mt-1 text-xl font-bold text-[#1A1A1A]">Ask about a program</h3>
        <p className="mt-1 text-sm text-[#5A6070]">
          Questions go to {toEmail}. We usually reply within one business day.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="programs-contact-name" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            id="programs-contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
          />
        </div>
        <div>
          <label htmlFor="programs-contact-email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="programs-contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="programs-contact-program" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Program name <span className="text-[#5A6070]">(optional)</span>
        </label>
        <input
          id="programs-contact-program"
          type="text"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="e.g. Chess Club, NOVA Math"
          className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
        />
      </div>

      <div>
        <label htmlFor="programs-contact-message" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="programs-contact-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What would you like to know?"
          className="w-full resize-none rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
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
        style={{ backgroundColor: '#085508' }}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            Send to VP of Programs
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  )
}
