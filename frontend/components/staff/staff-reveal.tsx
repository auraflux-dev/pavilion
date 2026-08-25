'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Collapsed-by-default Staff section. Remembers open/closed in localStorage.
 * Use for tools that are occasional (demand log, backup register), not the
 * primary job of the page (e.g. open pickups waiting for handoff).
 *
 * Collapsed: white (not a darker tint) + explicit “Show …” label.
 */
export function StaffReveal({
  storageKey,
  id,
  title,
  closedTitle,
  hint,
  badge,
  defaultOpen = false,
  children,
}: {
  storageKey: string
  id?: string
  /** Label when expanded */
  title: string
  /** Collapsed button label (defaults to “Show {title}”) */
  closedTitle?: string
  hint?: string
  /** Shown on the collapsed button, e.g. "3 open" */
  badge?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw === '1') setOpen(true)
      if (raw === '0') setOpen(false)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  function toggle(next: boolean) {
    setOpen(next)
    try {
      window.localStorage.setItem(storageKey, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const showLabel = closedTitle || `Show ${title}`

  return (
    <div id={id} className="scroll-mt-28 space-y-2">
      {!open ? (
        <button
          type="button"
          onClick={() => toggle(true)}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left hover:border-[var(--brand-green)]/40"
        >
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-[#1A1A1A]">{showLabel}</span>
              {badge ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 tabular-nums">
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs font-bold text-[#5A6070]">Show</span>
          </span>
          {hint ? (
            <span className="block text-xs font-normal text-[#5A6070] mt-0.5">{hint}</span>
          ) : null}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">{title}</p>
            <button
              type="button"
              onClick={() => toggle(false)}
              className="text-xs font-bold underline text-[#5A6070]"
            >
              Hide
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}
