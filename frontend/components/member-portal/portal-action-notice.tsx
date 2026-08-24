'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export type PortalNoticeTone = 'success' | 'error'

export type PortalNotice = {
  tone: PortalNoticeTone
  message: string
}

type Props = {
  tone: PortalNoticeTone
  message: string
  onDismiss?: () => void
  className?: string
}

export function PortalActionNotice({ tone, message, onDismiss, className = '' }: Props) {
  const isSuccess = tone === 'success'
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${
        isSuccess ? 'border-[var(--brand-line)] bg-[#E8F3E8]' : 'border-red-200 bg-red-50'
      } ${className}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[var(--brand-green)]" aria-hidden />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" aria-hidden />
        )}
        <p
          className={`text-sm font-semibold whitespace-pre-line leading-relaxed ${
            isSuccess ? 'text-[var(--brand-green)]' : 'text-red-800'
          }`}
        >
          {message}
        </p>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#5A6070] shrink-0 hover:text-[#1A1A1A]"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  )
}

export function usePortalNotice(autoDismissMs = 8000) {
  const [notice, setNotice] = useState<PortalNotice | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    setNotice(null)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const show = useCallback(
    (tone: PortalNoticeTone, message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setNotice({ tone, message })
      timerRef.current = setTimeout(() => {
        setNotice(null)
        timerRef.current = null
      }, autoDismissMs)
    },
    [autoDismissMs],
  )

  const showSuccess = useCallback((message: string) => show('success', message), [show])
  const showError = useCallback((message: string) => show('error', message), [show])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { notice, showSuccess, showError, clear }
}
