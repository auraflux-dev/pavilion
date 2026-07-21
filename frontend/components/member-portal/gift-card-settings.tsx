'use client'

import { useState, useEffect } from 'react'
import { Zap, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  studentId: string
  studentName: string
}

const THRESHOLD_OPTIONS = [5, 10, 15, 20]
const RELOAD_OPTIONS = [20, 40, 75]

export function GiftCardSettings({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [threshold, setThreshold] = useState(10)
  const [reload, setReload] = useState(20)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  const [paymentLabel, setPaymentLabel] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved'>('loading')

  useEffect(() => {
    fetch(`/api/gift-card/auto-topoff?studentId=${studentId}`)
      .then(r => r.json())
      .then(d => {
        setEnabled(d.enabled ?? false)
        setThreshold(d.thresholdDollars ?? 10)
        setReload(d.reloadDollars ?? 20)
        setHasPaymentMethod(d.hasPaymentMethod ?? false)
        setPaymentLabel(d.paymentMethod ? `${d.paymentMethod.brand} ending in ${d.paymentMethod.last4}` : '')
        setStatus('idle')
      })
      .catch(() => setStatus('idle'))
  }, [studentId])

  async function save() {
    setStatus('saving')
    setError('')
    try {
      const response = await fetch('/api/gift-card/auto-topoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, enabled, thresholdDollars: threshold, reloadDollars: reload }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save settings')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
      setStatus('idle')
    }
  }

  return (
    <div className="rounded-xl border border-[#E8E4DC] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAF8] hover:bg-[#F5F0E8] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
          <span className="text-sm font-bold text-[#1A1A1A]">Auto Top-Off</span>
          {status === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5A6070]" />
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {enabled ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#5A6070]" /> : <ChevronDown className="w-4 h-4 text-[#5A6070]" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4 border-t border-[#E8E4DC]">
          <p className="text-xs text-[#5A6070] leading-relaxed">
            When {studentName}&apos;s balance reaches the threshold, Square securely charges your saved card and loads the student store card.
          </p>

          {hasPaymentMethod ? (
            <p className="text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Payment method: {paymentLabel}
            </p>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Save a card during a manual reload in Store &amp; Purchases before enabling auto top-off.
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1A1A1A]">Enable auto top-off</span>
            <button
              onClick={() => setEnabled(e => !e)}
              disabled={!hasPaymentMethod && !enabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${
                enabled ? 'bg-[#085508]' : 'bg-gray-200'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {enabled && (
            <>
              <div>
                <p className="text-xs font-semibold text-[#5A6070] uppercase tracking-wider mb-2">
                  Top off when balance drops to or below
                </p>
                <div className="flex gap-2 flex-wrap">
                  {THRESHOLD_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setThreshold(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${
                        threshold === t
                          ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                          : 'border-[#E8E4DC] text-[#5A6070]'
                      }`}
                    >
                      ${t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#5A6070] uppercase tracking-wider mb-2">
                  Reload amount
                </p>
                <div className="flex gap-2 flex-wrap">
                  {RELOAD_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setReload(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${
                        reload === r
                          ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                          : 'border-[#E8E4DC] text-[#5A6070]'
                      }`}
                    >
                      ${r}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#5A6070] bg-[#F5F0E8] rounded-lg px-3 py-2">
                At or below <strong>${threshold}</strong>, charge <strong>${reload}</strong> to {paymentLabel} and load the student card.
              </p>
            </>
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            onClick={save}
            disabled={status === 'saving' || status === 'loading' || (enabled && !hasPaymentMethod)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#085508' }}
          >
            {status === 'saving' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : status === 'saved' ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
