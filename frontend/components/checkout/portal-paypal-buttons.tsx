'use client'

import { useEffect, useRef, useState } from 'react'
import type { PortalPayBody } from '@/components/checkout/portal-card-checkout'

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: { layout?: string; color?: string; shape?: string; label?: string }
        createOrder: () => Promise<string>
        onApprove: (data: { orderID: string }) => Promise<void>
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
  /** Remount key when modal opens */
  active: boolean
}

export function PortalPayPalButtons({ payBody, onPaid, onError, active }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function boot() {
      const cfgRes = await fetch('/api/checkout/paypal/config')
      const cfg = await cfgRes.json()
      if (!cfg.configured || !cfg.clientId) {
        setMissing(true)
        return
      }

      const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        cfg.clientId
      )}&currency=USD&intent=capture&components=buttons`
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
            const res = await fetch('/api/checkout/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payBody),
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
              body: JSON.stringify({ ...payBody, orderId: data.orderID }),
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
      onError?.(err instanceof Error ? err.message : 'PayPal unavailable')
    })

    return () => {
      cancelled = true
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payBody serialized below
  }, [active, JSON.stringify(payBody)])

  if (missing) return null

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-[#E8E4DC]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">or PayPal</span>
        <div className="flex-1 h-px bg-[#E8E4DC]" />
      </div>
      {!ready ? <p className="text-[11px] text-[#5A6070] text-center">Loading PayPal…</p> : null}
      <div ref={hostRef} />
    </div>
  )
}
