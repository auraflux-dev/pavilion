'use client'

/**
 * First-run Staff coach. Five beats, then hand off to role onboarding.
 * Shown once per browser (localStorage). Pavilion trials included.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const STORAGE_KEY = 'staff-coach-tour-v1'

const BEATS = [
  'You are in Staff. Staff is the board side. The member portal is the parent side. Switch with Member and Staff in the top right.',
  'Your workspaces. You only see what your job needs. Groups on Home match jobs, not menus.',
  'Nothing here is public until you say so. Page copy and Site settings publish live. Everything else stays internal.',
  'Where money lives. Payments is what came in. Budget is your plan. Neither one is your book of record.',
  'Getting unstuck. Help has how-tos for your seat. Your checklist on Home is the short version.',
] as const

export function StaffCoachTour({ showMoneyBeat = true }: { showMoneyBeat?: boolean }) {
  const [step, setStep] = useState<number | null>(null)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'done') return
    } catch {
      /* private mode: still show */
    }
    setStep(0)
  }, [])

  const beats = showMoneyBeat ? [...BEATS] : BEATS.filter((_, i) => i !== 3)

  function finish() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'done')
    } catch {
      /* ignore */
    }
    setStep(null)
  }

  if (step == null || step < 0 || step >= beats.length) return null

  return (
    <div
      className="rounded-xl border border-[var(--brand-green)]/30 bg-white p-4 shadow-sm space-y-3"
      role="dialog"
      aria-label="Staff tour"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070]">
            Staff tour · {step + 1} of {beats.length}
          </p>
          <p className="mt-1 text-sm text-[#1A1A1A] whitespace-pre-line leading-relaxed">
            {beats[step]}
          </p>
        </div>
        <button
          type="button"
          onClick={finish}
          className="shrink-0 rounded-md p-1 text-[#5A6070] hover:bg-[var(--brand-soft)]"
          aria-label="Dismiss tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : null}
        {step < beats.length - 1 ? (
          <Button
            type="button"
            size="sm"
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={finish}
          >
            Got it
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={finish}>
          Skip tour
        </Button>
      </div>
    </div>
  )
}
