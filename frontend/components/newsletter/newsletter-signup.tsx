'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
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
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">You&apos;re subscribed!</h3>
        <p className="text-[#5A6070] text-sm">
          Welcome to the SHMS PTO newsletter. You&apos;ll hear from us soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Subscribe to the Newsletter</h3>
      <p className="text-sm text-[#5A6070] mb-6">
        Join hundreds of SHMS PTO families already in the loop.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@email.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E8E4DC] text-sm focus:outline-none focus:ring-2 focus:ring-[#085508]/20 focus:border-[#085508] transition-colors"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={status === 'loading'}
          className="w-full font-bold text-white group"
          style={{ backgroundColor: '#085508' }}
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subscribing…</>
          ) : (
            <>Subscribe <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>
          )}
        </Button>

        <p className="text-xs text-[#5A6070] text-center">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </form>
  )
}
