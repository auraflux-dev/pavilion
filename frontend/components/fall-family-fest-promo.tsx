'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import {
  FALL_FAMILY_FEST_EVENT_PATH,
  FALL_FAMILY_FEST_FLYER_URL,
  stillShowingFallFamilyFest,
} from '@/lib/fall-family-fest'

/**
 * Home promo for Fall Family Fest (Fri Sep 25 · school fields).
 */
export function FallFamilyFestPromo() {
  if (!stillShowingFallFamilyFest()) return null

  return (
    <section
      id="fall-family-fest"
      className="scroll-mt-28 relative overflow-hidden"
      aria-labelledby="fall-family-fest-heading"
      style={{
        background: 'linear-gradient(160deg, #fff8e8 0%, #ffe8c8 42%, #f5d4a0 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(8, 85, 8, 0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,420px)] gap-10 items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#c45a00] mb-3">
              Coming up · SHMS PTO
            </p>
            <h2
              id="fall-family-fest-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#085508] text-balance"
            >
              Fall Family Fest!
            </h2>
            <p className="mt-3 text-lg sm:text-xl font-bold text-[#e85d04]">
              Jump. Laugh. Snack. Repeat.
            </p>
            <p className="mt-4 text-base text-[#3d4a3d] leading-relaxed max-w-xl">
              Friday, September 25 · 5–8 p.m. on the school fields. Free inflatables, henna, corn
              hole, sack races, and hula hooping for Stone Hill families — younger siblings welcome.
              Food trucks on site.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={FALL_FAMILY_FEST_EVENT_PATH}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                <CalendarDays className="w-4 h-4" aria-hidden />
                Event details
              </Link>
              <a
                href={FALL_FAMILY_FEST_FLYER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-base font-bold border-2 border-[#085508] text-[#085508] bg-white hover:bg-white/90"
              >
                Open flyer
              </a>
            </div>
          </div>

          <Link
            href={FALL_FAMILY_FEST_EVENT_PATH}
            className="block rounded-2xl overflow-hidden border-4 border-[#085508] shadow-lg hover:shadow-xl transition-shadow rotate-1 hover:rotate-0"
          >
            <Image
              src={FALL_FAMILY_FEST_FLYER_URL}
              alt="Fall Family Fest flyer. Friday September 25, 5 to 8 p.m. School fields. Free activities for families."
              width={1200}
              height={675}
              className="w-full h-auto"
              sizes="(max-width: 1024px) 100vw, 420px"
              priority={false}
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
