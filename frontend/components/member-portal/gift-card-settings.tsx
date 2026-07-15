'use client'

import { useState, useEffect } from 'react'
import { Zap, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  studentId: string
  studentName: string
}

const THRESHOLD_OPTIONS = [5, 10, 15, 20]
const RELOAD_OPTIONS = [20, 40, 50]

export function GiftCardSettings({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [threshold, setThreshold] = useState(10)
  const [reload, setReload] = useState(20)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved'>('loading')

  useEffect(() => {
    fetch(`/api/gift-card/auto-topoff?studentId=${studentId}`)
      .then(r => r.json())
      .then(d => {
        setEnabled(d.enabled ?? false)
        setThreshold(d.thresholdDollars ?? 10)
        setReload(d.reloadDollars ?? 20)
        setStatus('idle')
      })
      .catch(() => setStatus('idle'))
  }, [studentId])

  async function save() {
    setStatus('saving')
    try {
      await fetch('/api/gift-card/auto-topoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, enabled, thresholdDollars: threshold, reloadDollars: reload }),
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
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
            When {studentName}'s card drops below the threshold, we automatically reload it so they're never turned away.
          </p>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1A1A1A]">Enable auto top-off</span>
            <button
              onClick={() => setEnabled(e => !e)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                enabled ? 'bg-[#085508]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {enabled && (
            <>
              {/* Threshold */}
              <div>
                <p className="text-xs font-semibold text-[#5A6070] uppercase tracking-wider mb-2">
                  Top off when balance drops below
                </p>
                <div className="flex gap-2 flex-wrap">
                  {THRESHOLD_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setThreshold(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                        threshold === t
                          ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                          : 'border-[#E8E4DC] text-[#5A6070] hover:border-[#085508]'
                      }`}
                    >
                      ${t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reload amount */}
              <div>
                <p className="text-xs font-semibold text-[#5A6070] uppercase tracking-wider mb-2">
                  Reload amount
                </p>
                <div className="flex gap-2 flex-wrap">
                  {RELOAD_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setReload(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                        reload === r
                          ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                          : 'border-[#E8E4DC] text-[#5A6070] hover:border-[#085508]'
                      }`}
                    >
                      ${r}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#5A6070] bg-[#F5F0E8] rounded-lg px-3 py-2">
                When balance falls below <strong>${threshold}</strong>, we'll automatically add <strong>${reload}</strong> using your saved payment method.
              </p>
            </>
          )}

          <button
            onClick={save}
            disabled={status === 'saving' || status === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-50"
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
