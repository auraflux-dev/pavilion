'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_FLYER_PDF_URL,
  RUN_FOR_CHARITY_REGISTER_PATH,
} from '@/lib/run-for-charity'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

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
 * One job: get families to register. The Best Runners link already applies SHMS.
 */
export function RunForCharityPromo() {
  const earlyBird = isEarlyBird()

  if (!stillShowingPromo()) return null

  function openBestRunners() {
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
          {vanillaizeIfDemo(
            'Best Runners hosts the race. Our register link applies school code SHMS so Stone Hill receives 100% of your registration fee.',
          )}
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
                  {vanillaizeIfDemo('Rock Ridge High School · Ashburn')}
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

            <div
              className="rounded-2xl border-2 border-[#98C818]/60 bg-black/15 p-6 text-center space-y-3"
            >
              <p className="text-sm text-white/80 leading-relaxed">
                {vanillaizeIfDemo(
                  'Tap register — Best Runners fills in SHMS for you.',
                )}
              </p>
              <button
                type="button"
                onClick={openBestRunners}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-base font-bold text-[#085508] bg-[#FFD700] hover:bg-[#ffe44d] transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Register on Best Runners
              </button>
              <a
                href={RUN_FOR_CHARITY_FLYER_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-semibold text-white/80 hover:text-white underline underline-offset-2"
              >
                Download printable flyer (PDF)
              </a>
            </div>

            <p className="text-sm text-white/65">
              <Link
                href={RUN_FOR_CHARITY_REGISTER_PATH}
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Full event details
              </Link>
            </p>
          </div>

          <figure className="lg:sticky lg:top-28 space-y-4">
            <button
              type="button"
              onClick={openBestRunners}
              className="relative block w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)] ring-2 ring-[#98C818] text-left hover:opacity-[0.98] transition-opacity cursor-pointer"
            >
              <p className="px-4 py-4 text-center text-base sm:text-lg font-bold tracking-wide text-[#0B3D0B] bg-[#FFD700] flex items-center justify-center gap-2">
                <ExternalLink className="w-5 h-5 shrink-0" aria-hidden />
                Official flyer · tap to register on Best Runners
              </p>
              <Image
                src="/events/run-for-charity-2026.jpg"
                alt="Run for Charity 1K and 5K flyer: Sunday September 13 2026 at Rock Ridge High School, early bird through August 15"
                width={721}
                height={1024}
                className="w-full h-auto"
                priority
              />
            </button>
          </figure>
        </div>
      </div>
    </section>
  )
}
