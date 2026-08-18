'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { BEST_RUNNERS_SIGNUP_URL } from '@/lib/run-for-charity'
import { trackGenerateLead } from '@/lib/ga'

type Props = {
  /** When true, omit early-bird footer (parent page already shows it). */
  compact?: boolean
}

/**
 * One action: open Best Runners signup (ref=SHMS is already on the URL).
 */
export function RunForCharityRegisterBridge({ compact = false }: Props) {
  function openBestRunners() {
    window.open(BEST_RUNNERS_SIGNUP_URL, '_blank', 'noopener,noreferrer')
    trackGenerateLead({ formId: 'run_for_charity', leadType: 'run_for_charity' })
  }

  return (
    <div id="register" className="scroll-mt-28 space-y-6">
      <header className="space-y-2 text-center sm:text-left">
        <h2
          id="rfc-register-heading"
          className="text-xl sm:text-2xl font-bold text-[#1A1A1A]"
        >
          Run for Charity registration
        </h2>
        <p className="text-sm sm:text-base text-[#5A6070] leading-relaxed">
          Best Runners runs the race. Tap register — the link fills in school code
          SHMS so Stone Hill receives the registration fees.
        </p>
      </header>

      <Button
        type="button"
        className="w-full text-white font-bold text-base py-6"
        style={{ backgroundColor: '#0B3D0B' }}
        onClick={openBestRunners}
      >
        <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
        Register on Best Runners
      </Button>

      {!compact ? (
        <p className="text-xs text-center text-[#5A6070] whitespace-pre-line leading-relaxed">
          {`Early bird through Aug 15\nAdults $25 · Kids $15\nRace day: Sunday, Sep 13, 2026 · Rock Ridge High School.`}
        </p>
      ) : null}
    </div>
  )
}
