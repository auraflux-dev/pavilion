'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'

const TOPICS = [
  'Account & login',
  'Students',
  'Membership',
  'The Cove / store card',
  'Programs',
  'Website / content',
  'Other',
] as const

type Props = {
  memberName?: string
  /** Compact layout for portal home help strip. */
  compact?: boolean
}

export function PortalHelpForm({ memberName = '', compact = false }: Props) {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('Account & login')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/portal/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberName,
          topic,
          message,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send')
      setStatus('success')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send. Try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={`rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] ${compact ? 'px-4 py-3' : 'p-6'} text-center sm:text-left`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0 mx-auto sm:mx-0" style={{ color: '#085508' }} />
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">Message sent</p>
            <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
              President, Membership Experience, and Marketing received your question. Reply will
              come to your portal sign-in email.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setStatus('idle')}
            >
              Ask another question
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={`rounded-xl border border-[#E8E4DC] bg-white space-y-4 ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
    >
      <div>
        <h3 className="text-sm font-bold text-[#1A1A1A]">Ask the PTO</h3>
        <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
          Signed-in help request. Goes to President, VP Membership Experience, and VP Marketing.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-[#1A1A1A]">Topic</span>
        <select
          className="mt-1.5 w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value as (typeof TOPICS)[number])}
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-[#1A1A1A]">Your question</span>
        <textarea
          className="mt-1.5 w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm min-h-[7rem]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={4000}
          placeholder="What do you need help with? Include student grade if it helps."
        />
      </label>

      {status === 'error' ? <p className="text-xs text-amber-900">{error}</p> : null}

      <Button
        type="submit"
        disabled={status === 'loading' || message.trim().length < 10}
        className="text-white"
        style={{ backgroundColor: '#085508' }}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending…
          </>
        ) : (
          'Send help request'
        )}
      </Button>
    </form>
  )
}
