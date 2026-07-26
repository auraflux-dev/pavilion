'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  /** Called with raw decoded string (QR / barcode). */
  onScan: (value: string) => void
  /** Pause decoding briefly after a hit so one code isn't double-fired. */
  cooldownMs?: number
  className?: string
  /** Compact label for rush UI */
  label?: string
}

/**
 * Phone / tablet camera scanner for Cove register.
 * USB keyboard-wedge scanners do not need this. They type into the focused input.
 */
export function CoveCameraScanner({
  onScan,
  cooldownMs = 1200,
  className = '',
  label = 'Camera scan',
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const elementId = `cove-scan-${reactId}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastHit = useRef(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    return () => {
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        void s
         .stop()
         .catch(() => undefined)
         .finally(() => {
            try {
              s.clear()
            } catch {
              // ignore
            }
          })
      }
    }
  }, [])

  async function start() {
    setStarting(true)
    setError('')
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => undefined)
        scannerRef.current.clear()
        scannerRef.current = null
      }
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 8,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        (decoded: string, _result: Html5QrcodeResult) => {
          const now = Date.now()
          if (now - lastHit.current < cooldownMs) return
          lastHit.current = now
          const value = decoded.trim()
          if (value) onScanRef.current(value)
        },
        () => undefined
      )
      setRunning(true)
    } catch (err) {
      setRunning(false)
      setError(
        err instanceof Error
          ? err.message
          : 'Camera unavailable. Use a USB scanner or type the code.'
      )
    } finally {
      setStarting(false)
    }
  }

  async function stop() {
    setRunning(false)
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        await s.stop()
        s.clear()
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {!running ? (
          <Button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Camera className="w-4 h-4 mr-1.5" />
            )}
            {label}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => void stop()}>
            <CameraOff className="w-4 h-4 mr-1.5" /> Stop camera
          </Button>
        )}
        <p className="text-[11px] text-[#5A6070]">
          Point at the student&apos;s family QR. Product barcodes are optional (staff, behind the counter).
        </p>
      </div>
      <div
        id={elementId}
        className={`overflow-hidden rounded-xl bg-black/90 ${running ? 'min-h-[220px]' : 'h-0'}`}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

/** @deprecated Prefer coveDigitalCardScanPayload. kept for short PIN fallbacks. */
export function coveFamilyScanPayload(code: string): string {
  const digits = String(code).replace(/\D/g, '')
  return `SHMSCOVE:${digits}`
}

/**
 * Parse scanner input into family PIN, Square GAN (Wallet / Stand QR), or product SKU.
 * Square gift-card QR = raw GAN digits only (typically 16).
 */
export function parseCoveScan(
  raw: string,
  opts?: { preferProduct?: boolean }
): { kind: 'family'; code: string } | { kind: 'product'; sku: string } | null {
  const value = raw.trim()
  if (!value) return null

  const prefixed = value.match(/^(?:SHMSCOVE:|shmscove\/|cove:)\s*(\d{4,8})$/i)
  if (prefixed?.[1]) return { kind: 'family', code: prefixed[1] }

  const digits = value.replace(/\D/g, '')
 // Square GAN / Wallet pass / Photos QR. long numeric only
  if (/^\d{12,24}$/.test(digits)) {
    return { kind: 'family', code: digits }
  }

  // Family PIN (spoken at window). Prefer product for mid-length barcodes when requested.
  if (/^\d{4,6}$/.test(digits) && !opts?.preferProduct) {
    return { kind: 'family', code: digits }
  }

  return { kind: 'product', sku: value }
}

