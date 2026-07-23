'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { coveFamilyScanPayload } from '@/components/staff/cove-camera-scanner'

/** Shows the family Cove window code + QR kids can present at the snack window. */
export function CoveFamilyCodeCard() {
  const [code, setCode] = useState<string | null>(null)
  const [hasCard, setHasCard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/family-code')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load code')
      setCode(d.coveFamilyCode ?? null)
      setHasCard(Boolean(d.hasCard))
      if (d.message) setMessage(d.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load code')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function reset() {
    if (
      !window.confirm(
        'Generate a new family Cove code? The old code and QR will stop working at the window.'
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/family-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Reset failed')
      setCode(d.coveFamilyCode)
      setMessage('New code ready. screenshot or print the QR for your student(s).')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setMessage('Code copied')
    } catch {
      setMessage('Could not copy. write it down for your student')
    }
  }

  const payload = code ? coveFamilyScanPayload(code) : ''
  const qrUrl = payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(payload)}`
    : ''

  return (
    <div className="rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] px-3 py-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
        Family Cove code
      </p>
      {busy && !code ? (
        <Loader2 className="w-4 h-4 animate-spin mt-2 text-[#085508]" />
      ) : code ? (
        <div className="mt-2 flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`Cove family QR for code ${code}`}
            width={120}
            height={120}
            className="rounded-lg border border-[#E8E4DC] bg-white"
          />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold font-mono tracking-[0.2em] text-[#1A1A1A]">{code}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void reset()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-[#5A6070] mt-2 leading-relaxed">
              Students can say the 6-digit code at The Cove window, or show the QR so staff can scan
              it and charge the family balance
              {hasCard ? '.' : '. Load the family card so there is a balance to spend.'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#5A6070] mt-1">
          {message || 'Add a student to get a family Cove code.'}
        </p>
      )}
      {error ? <p className="text-[11px] text-red-600 mt-1">{error}</p> : null}
      {message && code ? <p className="text-[11px] text-green-700 mt-1">{message}</p> : null}
    </div>
  )
}
