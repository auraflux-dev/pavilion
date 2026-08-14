'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Check, Copy, ExternalLink } from 'lucide-react'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_REGISTER_PATH,
  RUN_FOR_CHARITY_SCHOOL_CODE,
} from '@/lib/run-for-charity'

/** Hide after race day (America/New_York calendar date). */
const RACE_DATE = '2026-09-13'
const EARLY_BIRD_END = '2026-08-15'

function etCalendarDate(now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

function stillShowingPromo(now = new Date()): boolean {
  return etCalendarDate(now) <= RACE_DATE
}

function isEarlyBird(now = new Date()): boolean {
  return etCalendarDate(now) <= EARLY_BIRD_END
}

/**
 * Home promo for Best Runners Run for Charity (Sun 9/13).
 * One job: get families to register with school code SHMS.
 */
export function RunForCharityPromo() {
  const [copied, setCopied] = useState(false)
  const earlyBird = isEarlyBird()

  if (!stillShowingPromo()) return null

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
  }

  return (
    <section
      id="run-for-charity"
      className="scroll-mt-28 relative overflow-hidden"
      aria-labelledby="run-for-charity-heading"
      style={{
        background:
          'linear-gradient(165deg, #0a3d0a 0%, #085508 42%, #0d4a0d 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 80% 20%, #98C818 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#98C818] mb-3">
          {earlyBird
            ? 'Early bird through Aug 15 · Race day Sun Sep 13'
            : 'Race day · Sunday Sep 13'}
        </p>
        <h2
          id="run-for-charity-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-balance max-w-3xl"
        >
          Run for Charity 1K &amp; 5K
        </h2>
        <p className="mt-4 text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl text-pretty">
          Best Runners hosts the race. Register with school code{' '}
          <span className="font-bold text-white">SHMS</span> so Stone Hill receives
          100% of your registration fee.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-8 text-white">
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                Race day
              </h3>
              <ul className="space-y-3 text-base sm:text-lg leading-snug">
                <li>
                  <span className="font-bold">Sunday, Sep 13, 2026</span>
                </li>
                <li className="text-white/80 text-sm sm:text-base">
                  Rock Ridge High School · Ashburn
                </li>
                <li className="text-white/80 text-sm sm:text-base">
                  1K &amp; 5K · medal, race shirt, post-race snacks
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                {earlyBird ? 'Early bird pricing' : 'Registration pricing'}
              </h3>
              {earlyBird ? (
                <ul className="space-y-2 text-sm sm:text-base text-white/90 leading-relaxed">
                  <li>
                    <span className="font-bold text-white">Adults $25</span>
                    <span className="text-white/75"> · Kids $15</span>
                    <span className="text-white/65"> · through Aug 15</span>
                  </li>
                  <li className="text-white/70 text-sm">
                    After Aug 15: Adults $30 · Kids $20
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm sm:text-base text-white/90 leading-relaxed">
                  <li>
                    <span className="font-bold text-white">Adults $30</span>
                    <span className="text-white/75"> · Kids $20</span>
                  </li>
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                School code · SHMS
              </h3>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Copy <span className="font-bold text-white">SHMS</span>, register on
                Best Runners, then paste it under{' '}
                <span className="font-bold text-white">School / Referral Code</span>{' '}
                before you pay.
              </p>
              <p
                className="mt-4 text-4xl sm:text-5xl font-bold tracking-[0.2em] text-white"
                aria-label={`School code ${RUN_FOR_CHARITY_SCHOOL_CODE}`}
              >
                {RUN_FOR_CHARITY_SCHOOL_CODE}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => void copyAndContinue()}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-[#085508] bg-[#FFD700] hover:bg-[#ffe44d] transition-colors"
              >
                Copy SHMS &amp; register
                <ExternalLink className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white border border-white/35 hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden />
                    Code copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden />
                    Copy code only
                  </>
                )}
              </button>
              <Link
                href={RUN_FOR_CHARITY_REGISTER_PATH}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white/90 hover:text-white transition-colors"
              >
                Full event details
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </div>

          <figure className="lg:sticky lg:top-28 space-y-4">
            <button
              type="button"
              onClick={() => void copyAndContinue()}
              className="relative block w-full rounded-xl overflow-hidden bg-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)] text-left hover:opacity-[0.98] transition-opacity cursor-pointer"
            >
              <Image
                src="/events/run-for-charity-2026.jpg"
                alt="Run for Charity 1K and 5K flyer: Sunday September 13 2026 at Rock Ridge High School, early bird through August 15"
                width={721}
                height={1024}
                className="w-full h-auto"
                priority
              />
            </button>
            <figcaption className="text-xs sm:text-sm text-white/65 text-center">
              Official flyer · tap to copy SHMS and open Best Runners registration
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
