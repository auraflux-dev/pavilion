'use client'

/**
 * Accessible helper tip. Prefer this over title= on controls.
 * Opens on click / Enter / Space. Esc closes. Click outside closes.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { tooltipCopy, type TooltipKey } from '@/lib/copy/tooltips'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

type Props = {
  tipKey?: TooltipKey
  /** Raw copy when not using the bank. Newlines render. */
  text?: string
  label?: string
  className?: string
  children?: ReactNode
}

export function HelpTip({ tipKey, text, label = 'More info', className, children }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const body = vanillaizeIfDemo(tipKey ? tooltipCopy(tipKey) : text ?? '')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  if (!body) return null

  return (
    <span ref={rootRef} className={`relative inline-flex align-middle ${className ?? ''}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full text-[#5A6070] hover:text-[var(--brand-green)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/40"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {children ?? <CircleHelp className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className="absolute z-40 left-1/2 top-full mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left text-xs leading-snug text-[#1A1A1A] shadow-md whitespace-pre-line"
        >
          {body}
        </span>
      ) : null}
    </span>
  )
}
