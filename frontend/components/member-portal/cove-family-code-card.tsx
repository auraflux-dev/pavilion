'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, Loader2, RefreshCw, Share2, Sparkles, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoveLogo } from '@/components/brand/cove-logo'

const PASSCODE_CALLOUT_KEY = 'shms_cove_passcode_callout_v1'

/**
 * Family Cove Digital Card. QR encodes Square GAN when loaded (Stand / iPad / Photos / Wallet).
 * Word passcode (name-based suggestion) + 6-digit PIN as spoken backups.
 */
export function CoveFamilyCodeCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [code, setCode] = useState<string | null>(null)
  const [passcode, setPasscode] = useState<string | null>(null)
  const [suggestedPasscode, setSuggestedPasscode] = useState('')
  const [passcodeDraft, setPasscodeDraft] = useState('')
  const [passcodeRules, setPasscodeRules] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)
  const [scanPayload, setScanPayload] = useState('')
  const [squareScanReady, setSquareScanReady] = useState(false)
  const [hasCard, setHasCard] = useState(false)
  const [paidMemberCode, setPaidMemberCode] = useState(false)
  const [codeHint, setCodeHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPasscodeCallout, setShowPasscodeCallout] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !window.localStorage.getItem(PASSCODE_CALLOUT_KEY)) {
        setShowPasscodeCallout(true)
      }
    } catch {
      setShowPasscodeCallout(true)
    }
  }, [])

  function dismissPasscodeCallout() {
    setShowPasscodeCallout(false)
    try {
      window.localStorage.setItem(PASSCODE_CALLOUT_KEY, '1')
    } catch {
      // ignore
    }
  }

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/family-code')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load code')
      setCode(d.coveFamilyCode ?? null)
      setPasscode(d.coveFamilyPasscode ?? null)
      setSuggestedPasscode(String(d.suggestedPasscode ?? ''))
      setPasscodeRules(String(d.passcodeRules ?? ''))
      setIsPrimary(d.isPrimary !== false)
      if (!d.coveFamilyPasscode && d.suggestedPasscode) {
        setPasscodeDraft(String(d.suggestedPasscode))
      } else if (d.coveFamilyPasscode) {
        setPasscodeDraft(String(d.coveFamilyPasscode))
      }
      setScanPayload(String(d.scanPayload ?? ''))
      setSquareScanReady(Boolean(d.squareScanReady))
      setHasCard(Boolean(d.hasCard))
      setPaidMemberCode(Boolean(d.paidMemberCode))
      setCodeHint(String(d.codeHint ?? ''))
      setMessage(typeof d.message === 'string' ? d.message : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load code')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

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
      setMessage('New 6-digit backup code ready. Phone QR is unchanged.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function savePasscode() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/family-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-passcode', passcode: passcodeDraft }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save passcode')
      setPasscode(d.coveFamilyPasscode)
      setMessage('Word passcode saved. Students can say this at The Cove.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save passcode')
    } finally {
      setBusy(false)
    }
  }

  async function useSuggestion() {
    if (suggestedPasscode) {
      setPasscodeDraft(suggestedPasscode)
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/gift-card/family-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-passcode' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not suggest')
      setSuggestedPasscode(String(d.suggestedPasscode ?? ''))
      setPasscodeDraft(String(d.suggestedPasscode ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest')
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string, label: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`${label} copied`)
    } catch {
      setMessage('Could not copy. Write it down for your student')
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
          title: 'SHMS PTO Cove Digital Card',
          text: `Family Cove Digital Card. Show this QR at The Cove or school store`,
        })
        setMessage('Shared. Add to Photos so your student can open it at checkout')
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
        setMessage('Apple Wallet pass downloaded. Open it to Add to Wallet.')
        return
      }
      const d = await r.json().catch(() => ({}))
      if (d.walletUrl || d.litecard?.welcomeUrl) {
        window.open(String(d.walletUrl || d.litecard.welcomeUrl), '_blank', 'noopener,noreferrer')
        setMessage('Opening Wallet pass. Add to Apple Wallet or Google Wallet on the next screen.')
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
    <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] px-3 py-3 mb-4">
      <div className="flex items-center gap-2.5">
        <CoveLogo size="xs" className="w-10 h-10 shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
          Family Cove Digital Card
        </p>
      </div>
      {busy && !code ? (
        <Loader2 className="w-4 h-4 animate-spin mt-2 text-[var(--brand-green)]" />
      ) : code ? (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-start gap-4">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Cove Digital Card QR for Square Stand and Cove"
                width={140}
                height={140}
                className="rounded-lg border border-[var(--border)] bg-white"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
                6-digit backup (if phone dies)
              </p>
              <p className="text-2xl font-bold font-mono tracking-[0.2em] text-[#1A1A1A]">{code}</p>
              {paidMemberCode ? (
                <p className="text-[11px] font-bold text-[var(--brand-green)] mt-1 whitespace-pre-line">
                  Lagoon / Tide code (ends in 9).
                  Show at event food tables.
                </p>
              ) : codeHint ? (
                <p className="text-[11px] text-[#5A6070] mt-1">{codeHint}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copy(code, 'Backup code')}
                  title="Copy code"
                >
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
                {isPrimary ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void reset()}
                    title="New 6-digit backup code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-[#5A6070] mt-2 leading-relaxed whitespace-pre-line">
                {squareScanReady
                  ? 'Save QR to Photos or Wallet.\nScan at Cove, store, or events.'
                  : hasCard
                    ? 'Load or refresh the card, then save QR again.'
                    : 'Load money below to activate this QR for The Cove.'}
              </p>
            </div>
          </div>

          {showPasscodeCallout ? (
            <div
              className="rounded-xl border-2 px-3 py-3 mb-1 relative overflow-hidden"
              style={{
                borderColor: '#C4A035',
                background:
                  'linear-gradient(135deg, #FFF9E8 0%, var(--brand-soft) 55%, #FAFCF9 100%)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm animate-pulse"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                  aria-hidden
                >
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: '#C4A035' }}
                    >
                      New
                    </span>
                    <span className="text-sm font-bold text-[#1A1A1A]">
                      Word passcode. Easier at The Cove
                    </span>
                  </p>
                  <p className="text-[12px] text-[#5A6070] mt-1 leading-relaxed">
                    Students can say a short word instead of six digits. We suggest your{' '}
                    <strong>last name + first letters of your first name</strong>. Set it below once,
                    then teach them the word.
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-bold underline"
                    style={{ color: 'var(--brand-green)' }}
                    onClick={() => {
                      document.getElementById('cove-word-passcode')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      })
                      dismissPasscodeCallout()
                    }}
                  >
                    Set my word passcode
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  className="absolute top-2 right-2 p-1 rounded-md text-[#5A6070] hover:bg-white/70"
                  onClick={dismissPasscodeCallout}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div
            id="cove-word-passcode"
            className="rounded-lg border-2 px-3 py-2.5 scroll-mt-4"
            style={{
              borderColor: passcode ? 'var(--brand-line)' : '#C4A035',
              backgroundColor: passcode ? '#fff' : '#FFFCF3',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070] flex items-center gap-1.5">
              {!passcode ? (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded text-white"
                  style={{ backgroundColor: '#C4A035' }}
                >
                  New
                </span>
              ) : null}
              Word passcode (easier to say)
            </p>
            {passcode ? (
              <p className="text-lg font-bold font-mono tracking-wide text-[#1A1A1A] mt-0.5">
                {passcode}
              </p>
            ) : (
              <p className="text-[11px] text-[#5A6070] mt-1">
                Not set yet. Staff can look up your family with this instead of the 6-digit code.
              </p>
            )}
            {isPrimary ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-[#5A6070] leading-relaxed">
                  {passcodeRules ||
                    '6-24 letters or numbers, at least one letter, no spaces. Suggested from your last name + first letters of your first name.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={passcodeDraft}
                    onChange={(e) => setPasscodeDraft(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder={suggestedPasscode || 'e.g. GregoryRo'}
                    maxLength={24}
                    className="min-w-[10rem] flex-1 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void useSuggestion()}
                  >
                    Use suggestion
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || passcodeDraft.length < 6}
                    onClick={() => void savePasscode()}
                    className="text-white"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                  >
                    Save
                  </Button>
                  {passcode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copy(passcode, 'Passcode')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#5A6070] mt-1">
                Ask the primary account holder to set the word passcode.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#5A6070] mt-2 leading-relaxed">
          {message ||
            'Add a student, confirm family details, then load money to start using your Cove Digital Card.'}
        </p>
      )}
      {error ? <p className="text-[11px] text-red-600 mt-1">{error}</p> : null}
      {message && code && !hasCard ? (
        <p className="text-[11px] font-semibold text-[#7A4200] mt-2 leading-relaxed">{message}</p>
      ) : null}
      {message && code && hasCard ? (
        <p className="text-[11px] text-green-700 mt-1">{message}</p>
      ) : null}
      <p className="sr-only">
        <Share2 aria-hidden />
      </p>
    </div>
  )
}
