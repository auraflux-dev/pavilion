'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, ExternalLink } from 'lucide-react'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_SCHOOL_CODE,
} from '@/lib/run-for-charity'
import { trackGenerateLead } from '@/lib/ga'

type Props = {
  /** When true, omit early-bird footer (parent page already shows it). */
  compact?: boolean
}

/**
 * Two actions only: copy SHMS (optional), or copy + open Best Runners.
 */
export function RunForCharityRegisterBridge({ compact = false }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(RUN_FOR_CHARITY_SCHOOL_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  async function copyAndContinue() {
    try {
      await navigator.clipboard.writeText(RUN_FOR_CHARITY_SCHOOL_CODE)
      setCopied(true)
    } catch {
      /* still open Best Runners */
    }
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
          Best Runners runs the race. Use our school code so Stone Hill gets the
          registration fees. Copy the code, then continue to their signup form.
        </p>
      </header>

      <div
        className="rounded-2xl border-2 bg-white p-6 text-center space-y-3"
        style={{ borderColor: '#085508' }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#085508]">
          Stone Hill school code
        </p>
        <p
          className="text-5xl font-bold tracking-[0.2em] text-[#0B3D0B]"
          aria-label={`School code ${RUN_FOR_CHARITY_SCHOOL_CODE}`}
        >
          {RUN_FOR_CHARITY_SCHOOL_CODE}
        </p>
        <p className="text-sm font-medium text-[#3D4450]">
          Paste this in Best Runners under <strong>School / Referral Code</strong> so
          Stone Hill receives 100% of your registration fee.
        </p>
      </div>

      <ol className="space-y-2 text-sm text-[#5A6070] list-decimal pl-5">
        <li>Copy school code <strong>SHMS</strong>.</li>
        <li>
          Continue to Best Runners, then tap <strong>Register Now</strong>.
        </li>
        <li>
          Paste <strong>SHMS</strong> in School / Referral Code before you pay.
        </li>
      </ol>

      <Button
        type="button"
        className="w-full text-white font-bold text-base py-6"
        style={{ backgroundColor: '#0B3D0B' }}
        onClick={() => void copyAndContinue()}
      >
        <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
        Copy SHMS &amp; continue to Best Runners
      </Button>

      <p className="text-center">
        <button
          type="button"
          onClick={() => void copyCode()}
          className="text-sm font-semibold text-[#085508] hover:underline underline-offset-2 inline-flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              Code copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy code only
            </>
          )}
        </button>
      </p>

      {!compact ? (
        <p className="text-xs text-center text-[#5A6070] whitespace-pre-line leading-relaxed">
          {`Early bird through Aug 15\nAdults $25 · Kids $15\nRace day: Sunday, Sep 13, 2026 · Rock Ridge High School.`}
        </p>
      ) : null}
    </div>
  )
}
