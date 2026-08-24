'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { trackGenerateLead } from '@/lib/ga'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { CONTACT_FORM_DEFAULTS } from '@/lib/defaults/visitor-forms-defaults'
import { formString } from '@/lib/copy/form-string'

const TOPIC_KEYS = [
  'form.topic.general',
  'form.topic.programs',
  'form.topic.cove',
  'form.topic.volunteer',
  'form.topic.membership',
  'form.topic.fundraising',
  'form.topic.events',
  'form.topic.board',
  'form.topic.other',
] as const

interface FormState {
  name: string
  email: string
  topic: string
  message: string
}

type Props = {
  copy?: Record<string, string>
}

export function ContactForm({ copy }: Props) {
  const strings = { ...CONTACT_FORM_DEFAULTS, ...copy }
  const t = (key: string) => vanillaizeIfDemo(formString(strings, key, key))

  const topics = useMemo(
    () => TOPIC_KEYS.map((key) => ({ key, label: t(key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copy prop is stable per page load
    [copy],
  )

  const [form, setForm] = useState<FormState>({ name: '', email: '', topic: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'preview' | 'error'>('idle')

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
      const data = (await res.json().catch(() => ({}))) as { demo?: boolean }
      if (!res.ok) throw new Error()
      trackGenerateLead({ formId: 'contact', leadType: form.topic || 'contact' })
      setStatus(data.demo ? 'preview' : 'success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success' || status === 'preview') {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--brand-green)' }} />
        </div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
          {status === 'preview' ? t('form.previewTitle') : t('form.successTitle')}
        </h3>
        <p className="text-[#5A6070] text-sm max-w-xs mx-auto whitespace-pre-line">
          {status === 'preview' ? t('form.previewBody') : t('form.successBody')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm space-y-5">
      <h2 className="text-xl font-bold text-[#1A1A1A]">{t('form.title')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            {t('form.nameLabel')} <span className="text-red-500">*</span>
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
            {t('form.emailLabel')} <span className="text-red-500">*</span>
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

      <div>
        <label htmlFor="contact-topic" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          {t('form.topicLabel')} <span className="text-red-500">*</span>
        </label>
        <select
          id="contact-topic"
          required
          value={form.topic}
          onChange={update('topic')}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors bg-white"
        >
          <option value="" disabled>Select a topic…</option>
          {topics.map(({ key, label }) => (
            <option key={key} value={label}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          {t('form.messageLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={update('message')}
          placeholder={t('form.messagePlaceholder')}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] transition-colors resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{t('form.error')}</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={status === 'loading'}
        className="w-full font-bold text-white group"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('form.sending')}</>
        ) : (
          <>{t('form.submit')} <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>
        )}
      </Button>

      <p className="text-xs text-[#5A6070] text-center">
        We respond within one business day during the school year.
      </p>
    </form>
  )
}
