'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SurveyDefinition } from '@/lib/surveys/types'

interface Props {
  survey: SurveyDefinition
  channel?: string
}

export function SurveyForm({ survey, channel = 'link' }: Props) {
  const accent = survey.branding.accentColor ?? '#085508'
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function setField(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/surveys/${survey.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submit failed')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#E8E4DC] bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-[#1A1A1A] mb-2">Thank you!</p>
        <p className="text-sm text-[#5A6070]">{survey.branding.thankYouMessage}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E8E4DC] bg-white p-6 md:p-8 shadow-sm space-y-5">
      {survey.intro ? (
        <p className="text-sm text-[#5A6070] leading-relaxed">{survey.intro}</p>
      ) : null}

      {survey.fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
            {field.label}
            {field.required ? <span className="text-red-600"> *</span> : null}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={answers[field.id] ?? ''}
              onChange={(e) => setField(field.id, e.target.value)}
              required={field.required}
              rows={4}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085508]/30"
            />
          ) : field.type === 'choice' && field.options?.length ? (
            <div className="flex flex-wrap gap-2">
              {field.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setField(field.id, opt)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                    answers[field.id] === opt
                      ? 'text-white border-transparent'
                      : 'border-[#E8E4DC] text-[#5A6070]'
                  }`}
                  style={answers[field.id] === opt ? { backgroundColor: accent } : undefined}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type={field.type === 'email' ? 'email' : 'text'}
              value={answers[field.id] ?? ''}
              onChange={(e) => setField(field.id, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085508]/30"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto text-white font-bold"
        style={{ backgroundColor: accent }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
      </Button>
    </form>
  )
}
