'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { NEWSLETTER_SIGNUP_DEFAULTS } from '@/lib/defaults/visitor-forms-defaults'
import { formString } from '@/lib/copy/form-string'

type Props = {
  copy?: Record<string, string>
}

export function NewsletterSignup({ copy }: Props) {
  const strings = { ...NEWSLETTER_SIGNUP_DEFAULTS, ...copy }
  const t = (key: string) => vanillaizeIfDemo(formString(strings, key, key))

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
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--brand-green)' }} />
        </div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{t('signup.successTitle')}</h3>
        <p className="text-[#5A6070] text-sm whitespace-pre-line">
          {isPublicDemoInstance() ? t('signup.successDemo') : t('signup.successBody')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{t('signup.title')}</h3>
      <p className="text-sm text-[#5A6070] mb-6 whitespace-pre-line">{t('signup.body')}</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            {t('signup.emailLabel')}
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('signup.emailPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600">{t('signup.error')}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={status === 'loading'}
          className="w-full font-bold text-white group"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('signup.sending')}</>
          ) : (
            <>{t('signup.submit')} <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>
          )}
        </Button>

        <p className="text-xs text-[#5A6070] text-center">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </form>
  )
}
