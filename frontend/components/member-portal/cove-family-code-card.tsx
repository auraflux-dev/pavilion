'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, Loader2, RefreshCw, Share2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Family Cove digital card — QR encodes Square GAN when loaded (Stand / iPad / Photos / Wallet).
 * 6-digit PIN stays as spoken backup if the phone dies.
 */
export function CoveFamilyCodeCard() {
  const [code, setCode] = useState<string | null>(null)
  const [scanPayload, setScanPayload] = useState('')
  const [squareScanReady, setSquareScanReady] = useState(false)
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
      setScanPayload(String(d.scanPayload ?? ''))
      setSquareScanReady(Boolean(d.squareScanReady))
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
        'Generate a new 6-digit spoken backup code? The phone QR (Square card number) does not change.',
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
      setMessage('New spoken backup code ready. Phone QR is unchanged.')
      await load()
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
      setMessage('Backup code copied')
    } catch {
      setMessage('Could not copy — write the code down for your student')
    }
  }

  const qrUrl = scanPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=16&data=${encodeURIComponent(scanPayload)}`
    : ''

  async function saveQrToDevice() {
    if (!qrUrl || !code) return
    try {
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      const file = new File([blob], `shms-cove-digital-card-${code}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'SHMS PTO Cove digital card',
          text: `Family Cove digital card — show this QR at The Cove or school store`,
        })
        setMessage('Shared — add to Photos so your student can open it at checkout')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shms-cove-digital-card-${code}.png`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('QR saved to Photos / Files. Student shows it at Square Stand or Cove.')
    } catch {
      setMessage('Long-press the QR image to save it to Photos.')
    }
  }

  async function addWalletPass() {
    if (!code) return
    setBusy(true)
    setError('')
    try {
      const ua = navigator.userAgent || ''
      const preferGoogle = /Android/i.test(ua)
      const platform = preferGoogle ? 'google' : 'apple'
      const r = await fetch('/api/gift-card/wallet-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, platform }),
      })
      const ctype = r.headers.get('content-type') || ''
      if (r.ok && ctype.includes('application/vnd.apple.pkpass')) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `shms-cove-${code}.pkpass`
        a.click()
        URL.revokeObjectURL(url)
        setMessage('Apple Wallet pass downloaded — open it to Add to Wallet.')
        return
      }
      const d = await r.json().catch(() => ({}))
      if (d.walletUrl || d.litecard?.welcomeUrl) {
        window.open(String(d.walletUrl || d.litecard.welcomeUrl), '_blank', 'noopener,noreferrer')
        setMessage('Opening Wallet pass — Add to Apple Wallet or Google Wallet on the next screen.')
        return
      }
      if (d.appleWalletUrl) {
        window.open(String(d.appleWalletUrl), '_blank', 'noopener,noreferrer')
        setMessage('Opening Apple Wallet pass…')
        return
      }
      if (d.googleWalletUrl) {
        window.open(String(d.googleWalletUrl), '_blank', 'noopener,noreferrer')
        setMessage('Opening Google Wallet…')
        return
      }
      await saveQrToDevice()
      setMessage(
        d.hint ||
          'QR saved to Photos. Square Stand / iPad can scan it like a gift card. Native Wallet turns on after Litecard credentials are added.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build wallet pass')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] px-3 py-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
        Family Cove digital card
      </p>
      {busy && !code ? (
        <Loader2 className="w-4 h-4 animate-spin mt-2 text-[#085508]" />
      ) : code ? (
        <div className="mt-2 flex flex-wrap items-start gap-4">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="Cove digital card QR for Square Stand and Cove"
              width={140}
              height={140}
              className="rounded-lg border border-[#E8E4DC] bg-white"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
              Spoken backup (if phone dies)
            </p>
            <p className="text-2xl font-bold font-mono tracking-[0.2em] text-[#1A1A1A]">{code}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copy()} title="Copy code">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !qrUrl}
                onClick={() => void saveQrToDevice()}
                title="Save QR to Photos"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !hasCard}
                onClick={() => void addWalletPass()}
                title="Add to wallet / Photos"
              >
                <Wallet className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void reset()}
                title="New backup code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-[#5A6070] mt-2 leading-relaxed">
              {squareScanReady ? (
                <>
                  Save this QR to <strong>Photos</strong> (or Wallet). Students open it at Cove /
                  store / events — Square Stand and iPad scan it like a gift card. Kids do not need
                  to remember the 6-digit code.
                </>
              ) : hasCard ? (
                <>Load or refresh the Cove card, then Save QR again.</>
              ) : (
                <>
                  Load the Cove digital card first. Then Save QR to Photos — that QR is what Square
                  Stand scans.
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#5A6070] mt-1">
          {message || 'Add a student to get a family Cove digital card.'}
        </p>
      )}
      {error ? <p className="text-[11px] text-red-600 mt-1">{error}</p> : null}
      {message && code ? <p className="text-[11px] text-green-700 mt-1">{message}</p> : null}
      <p className="sr-only">
        <Share2 aria-hidden />
      </p>
    </div>
  )
}
