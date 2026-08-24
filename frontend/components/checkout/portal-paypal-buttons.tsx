'use client'

import { useEffect, useRef, useState } from 'react'
import type { PortalPayBody } from '@/components/checkout/portal-card-checkout'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: { layout?: string; color?: string; shape?: string; label?: string }
        createOrder?: () => Promise<string>
        createVaultSetupToken?: () => Promise<string>
        onApprove: (data: { orderID?: string; vaultSetupToken?: string }) => Promise<void>
        onError?: (err: unknown) => void
        onCancel?: () => void
      }) => { render: (el: HTMLElement) => Promise<void> }
    }
  }
}

interface Props {
  payBody: PortalPayBody
  onPaid?: (data: Record<string, unknown>) => void
  onError?: (message: string) => void
  /** Save required parent name (etc.) before PayPal create/capture. */
  onBeforePay?: () => Promise<void>
  /** Remount key when modal opens */
  active: boolean
  /** Membership/program terms still unchecked. SDK can load; pay is blocked. */
  requireConsent?: boolean
}

type PayPalMethod = { payerEmail: string }

export function PortalPayPalButtons({
  payBody,
  onPaid,
  onError,
  onBeforePay,
  active,
  requireConsent = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const requireConsentRef = useRef(requireConsent)
  requireConsentRef.current = requireConsent
  const payBodyRef = useRef(payBody)
  payBodyRef.current = payBody
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)
  const [savedPayPal, setSavedPayPal] = useState<PayPalMethod | null>(null)
  const [savePayPal, setSavePayPal] = useState(false)
  const [useSaved, setUseSaved] = useState(false)
  const [busyVault, setBusyVault] = useState(false)
  const savePayPalRef = useRef(savePayPal)
  savePayPalRef.current = savePayPal
  const savedPayPalRef = useRef(savedPayPal)
  savedPayPalRef.current = savedPayPal

  // Remount only when checkout intent changes. not when consents toggle.
  const payIntentKey = JSON.stringify({
    ...payBody,
    consents: undefined,
  })

  useEffect(() => {
    if (!active) return
    fetch('/api/gift-card/payment-method')
      .then((r) => r.json())
      .then((data) => {
        const method = (data.paypalMethod as PayPalMethod | null) ?? null
        setSavedPayPal(method)
        setSavePayPal(!method)
        setUseSaved(Boolean(method))
      })
      .catch(() => undefined)
  }, [active])

  useEffect(() => {
    if (!active || useSaved) return
    let cancelled = false

    async function boot() {
      setReady(false)
      setMissing(false)
      const cfgRes = await fetch('/api/checkout/paypal/config')
      const cfg = await cfgRes.json()
      if (!cfg.configured || !cfg.clientId) {
        setMissing(true)
        return
      }

      const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        cfg.clientId,
      )}&currency=USD&intent=capture&components=buttons&vault=true&enable-funding=paypal`
      let script = document.querySelector<HTMLScriptElement>(`script[src^="https://www.paypal.com/sdk/js"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = src
        script.async = true
        document.head.appendChild(script)
        await new Promise<void>((resolve, reject) => {
          script!.onload = () => resolve()
          script!.onerror = () => reject(new Error('PayPal failed to load'))
        })
      } else if (!window.paypal) {
        await new Promise<void>((resolve) => {
          script!.addEventListener('load', () => resolve(), { once: true })
        })
      }

      if (cancelled || !window.paypal || !hostRef.current) return
      hostRef.current.innerHTML = ''
      await window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            if (requireConsentRef.current) {
              throw new Error('Please review and accept the required terms before paying.')
            }
            if (onBeforePay) await onBeforePay()
            const res = await fetch('/api/checkout/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...payBodyRef.current,
                savePayPal: !savedPayPalRef.current && savePayPalRef.current,
              }),
            })
            const data = await res.json()
            if (!res.ok || !data.orderId) {
              throw new Error(data.error || 'Could not start PayPal')
            }
            return data.orderId as string
          },
          onApprove: async (data) => {
            const res = await fetch('/api/checkout/paypal/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...payBodyRef.current,
                orderId: data.orderID,
                savePayPal: !savedPayPalRef.current && savePayPalRef.current,
              }),
            })
            const result = await res.json()
            if (!res.ok) {
              onError?.(result.error || 'PayPal payment failed')
              return
            }
            onPaid?.(result)
          },
          onError: (err) => {
            console.error(err)
            onError?.(err instanceof Error ? err.message : 'PayPal error')
          },
        })
        .render(hostRef.current)
      if (!cancelled) setReady(true)
    }

    boot().catch((err) => {
      console.error(err)
      setReady(false)
      onError?.(err instanceof Error ? err.message : 'PayPal unavailable')
    })

    return () => {
      cancelled = true
      setReady(false)
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payBody serialized below
  }, [active, useSaved, payIntentKey])

  async function payWithSaved() {
    setBusyVault(true)
    try {
      if (requireConsentRef.current) {
        throw new Error('Please review and accept the required terms before paying.')
      }
      if (onBeforePay) await onBeforePay()
      const res = await fetch('/api/checkout/paypal/pay-with-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payBodyRef.current),
      })
      const result = await res.json()
      if (!res.ok) {
        onError?.(result.error || 'Saved PayPal payment failed')
        return
      }
      onPaid?.(result)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Saved PayPal payment failed')
    } finally {
      setBusyVault(false)
    }
  }

  if (missing) return null

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">or PayPal</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {savedPayPal ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input type="radio" checked={useSaved} onChange={() => setUseSaved(true)} />
            Use saved PayPal ({savedPayPal.payerEmail})
          </label>
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input type="radio" checked={!useSaved} onChange={() => setUseSaved(false)} />
            Use a different PayPal
          </label>
          {useSaved ? (
            <Button
              type="button"
              disabled={busyVault}
              onClick={() => void payWithSaved()}
              className="w-full text-white font-semibold"
              style={{ backgroundColor: '#003087' }}
            >
              {busyVault ? 'Charging PayPal…' : `Pay with saved PayPal`}
            </Button>
          ) : null}
        </div>
      ) : (
        <label className="flex items-start gap-2 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={savePayPal}
            onChange={(e) => setSavePayPal(e.target.checked)}
            className="mt-0.5"
          />
          Save this PayPal to Payment methods for faster checkout later (never required).
        </label>
      )}

      {!useSaved ? (
        <>
          {!ready ? (
            <p className="text-[11px] text-[#5A6070] text-center">Loading PayPal…</p>
          ) : requireConsent ? (
            <p className="text-[11px] text-[#5A6070] text-center">
              Accept the required terms above to pay with PayPal.
            </p>
          ) : null}
          <div
            ref={hostRef}
            className={requireConsent ? 'pointer-events-none opacity-50' : undefined}
          />
        </>
      ) : null}
    </div>
  )
}
