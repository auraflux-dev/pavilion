'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, ExternalLink } from 'lucide-react'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_SCHOOL_CODE,
} from '@/lib/run-for-charity'

/**
 * Parent bridge: copy school code SHMS, then open Best Runners signup.
 * Best Runners does not pre-fill schoolReferralCode from the URL today.
 */
export function RunForCharityRegisterBridge() {
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-[#D9D2C5] bg-white p-6 text-center space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#085508]">
          Stone Hill school code
        </p>
        <p
          className="text-5xl font-bold tracking-[0.2em] text-[#0B3D0B]"
          aria-label={`School code ${RUN_FOR_CHARITY_SCHOOL_CODE}`}
        >
          {RUN_FOR_CHARITY_SCHOOL_CODE}
        </p>
        <p className="text-sm text-[#5A6070]">
          Paste this in Best Runners under <strong>School / Referral Code</strong> so
          Stone Hill receives 100% of your registration fee.
        </p>
        <Button
          type="button"
          onClick={() => void copyCode()}
          className="text-white font-semibold"
          style={{ backgroundColor: '#085508' }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
              Copy code SHMS
            </>
          )}
        </Button>
      </div>

      <ol className="space-y-2 text-sm text-[#5A6070] list-decimal pl-5">
        <li>Copy the school code above.</li>
        <li>Open Best Runners registration.</li>
        <li>
          Paste <strong>SHMS</strong> in the School / Referral Code field before you
          pay.
        </li>
      </ol>

      <Button
        className="w-full text-white font-semibold text-base py-6"
        style={{ backgroundColor: '#0B3D0B' }}
        asChild
      >
        <a href={BEST_RUNNERS_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
          Continue to Best Runners registration
        </a>
      </Button>

      <p className="text-xs text-center text-[#5A6070]">
        Early bird through Aug 15: Adults $25 · Kids $15. Race day: Sunday, Sep 13,
        2026 · Rock Ridge High School.
      </p>
    </div>
  )
}
