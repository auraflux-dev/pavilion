'use client'

/**
 * Required legal checkboxes for checkout. each has a Read link that opens the full text.
 */
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2, X } from 'lucide-react'
import type { ConsentAck, CheckoutConsentKind } from '@/lib/checkout-consent'

type ConsentDocPayload = {
  id: string
  slug: string
  label: string
  required: boolean
  mode: 'agree' | 'choice'
  doc: {
    title: string
    updated: string
    sections: { heading: string; body: string }[]
  }
}

interface Props {
  kind: CheckoutConsentKind
  onChange: (acks: ConsentAck[] | null, complete: boolean) => void
}

export function CheckoutConsent({ kind, onChange }: Props) {
  const [items, setItems] = useState<ConsentDocPayload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [choices, setChoices] = useState<Record<string, boolean | null>>({})
  const [reading, setReading] = useState<ConsentDocPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setAccepted({})
    setChoices({})
    onChange(null, false)

    fetch(`/api/checkout/consent?kind=${encodeURIComponent(kind)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not load terms')
        if (cancelled) return
        const list = (data.items ?? []) as ConsentDocPayload[]
        setItems(list)
        const initialChoices: Record<string, boolean | null> = {}
        for (const item of list) {
          if (item.mode === 'choice') initialChoices[item.id] = null
        }
        setChoices(initialChoices)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load terms')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // onChange is stable enough via parent; avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const complete = useMemo(() => {
    if (!items.length) return true
    return items.every((item) => {
      if (item.mode === 'agree') return Boolean(accepted[item.id])
      return choices[item.id] === true || choices[item.id] === false
    })
  }, [items, accepted, choices])

  useEffect(() => {
    if (!items.length) {
      onChange([], true)
      return
    }
    if (!complete) {
      onChange(null, false)
      return
    }
    const now = new Date().toISOString()
    const acks: ConsentAck[] = items.map((item) => ({
      id: item.id,
      slug: item.slug as ConsentAck['slug'],
      accepted: item.mode === 'agree' ? Boolean(accepted[item.id]) : Boolean(choices[item.id]),
      acceptedAt: now,
      docVersion: item.doc.updated,
    }))
    onChange(acks, true)
  }, [items, accepted, choices, complete, onChange])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#5A6070]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading terms…
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>
  }

  if (!items.length) return null

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[#FAFCF9] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070]">
        Required terms
      </p>
      {items.map((item) => (
        <div key={item.id} className="space-y-1.5">
          {item.mode === 'agree' ? (
            <label className="flex items-start gap-2 text-xs text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={Boolean(accepted[item.id])}
                onChange={(e) =>
                  setAccepted((prev) => ({ ...prev, [item.id]: e.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                {item.label}{' '}
                <button
                  type="button"
                  onClick={() => setReading(item)}
                  className="inline-flex items-center gap-0.5 font-semibold text-[var(--brand-green)] hover:underline"
                >
                  Read
                  <ExternalLink className="w-3 h-3" />
                </button>
              </span>
            </label>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-[#1A1A1A]">
                {item.label}{' '}
                <button
                  type="button"
                  onClick={() => setReading(item)}
                  className="inline-flex items-center gap-0.5 font-semibold text-[var(--brand-green)] hover:underline"
                >
                  Read
                  <ExternalLink className="w-3 h-3" />
                </button>
              </p>
              <div className="flex gap-3 pl-0.5">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name={`choice-${item.id}`}
                    checked={choices[item.id] === true}
                    onChange={() => setChoices((prev) => ({ ...prev, [item.id]: true }))}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name={`choice-${item.id}`}
                    checked={choices[item.id] === false}
                    onChange={() => setChoices((prev) => ({ ...prev, [item.id]: false }))}
                  />
                  No
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      {reading ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-read-title"
        >
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-[var(--border)] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="consent-read-title"
                  className="text-base font-bold text-[#1A1A1A]"
                >
                  {reading.doc.title}
                </p>
                <p className="text-xs text-[#5A6070] mt-1">
                  Last updated: {reading.doc.updated}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReading(null)}
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#5A6070]" />
              </button>
            </div>
            <div className="space-y-4">
              {reading.doc.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                    {section.heading}
                  </h3>
                  <p className="text-sm text-[#5A6070] leading-relaxed">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (reading.mode === 'agree') {
                  setAccepted((prev) => ({ ...prev, [reading.id]: true }))
                }
                setReading(null)
              }}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {reading.mode === 'agree' ? 'I understand. close' : 'Close'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
