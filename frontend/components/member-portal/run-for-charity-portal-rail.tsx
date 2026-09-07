'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_FLYER_IMAGE_PATH,
  runForCharityPriceLine,
  stillShowingRunForCharity,
} from '@/lib/run-for-charity'
import {
  FALL_FAMILY_FEST_EVENT_PATH,
  FALL_FAMILY_FEST_FLYER_URL,
  stillShowingFallFamilyFest,
} from '@/lib/fall-family-fest'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { isDemoInstance } from '@/lib/demo/instance'

const RFC_DISMISS_KEY = 'shms-rfc-portal-rail-dismissed'
const FFF_DISMISS_KEY = 'shms-fff-portal-rail-dismissed'

/** Flyer display width (791×1024 source). 300px keeps event copy legible in the rail. */
const RAIL_FLYER_WIDTH = 300
const RAIL_FLYER_HEIGHT = Math.round((RAIL_FLYER_WIDTH * 1024) / 791)

/**
 * Sticky right-rail promos on member portal home (xl+):
 * Run for Charity on top, compact Fall Family Fest underneath with spacing.
 */
export function RunForCharityPortalRail() {
  const [rfcVisible, setRfcVisible] = useState(false)
  const [fffVisible, setFffVisible] = useState(false)

  useEffect(() => {
    if (isDemoInstance() || isCommonsPlatform()) return
    try {
      if (stillShowingRunForCharity() && sessionStorage.getItem(RFC_DISMISS_KEY) !== '1') {
        setRfcVisible(true)
      }
      if (stillShowingFallFamilyFest() && sessionStorage.getItem(FFF_DISMISS_KEY) !== '1') {
        setFffVisible(true)
      }
    } catch {
      if (stillShowingRunForCharity()) setRfcVisible(true)
      if (stillShowingFallFamilyFest()) setFffVisible(true)
    }
  }, [])

  if (!rfcVisible && !fffVisible) return null

  function dismissRfc() {
    try {
      sessionStorage.setItem(RFC_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setRfcVisible(false)
  }

  function dismissFff() {
    try {
      sessionStorage.setItem(FFF_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setFffVisible(false)
  }

  return (
    <aside
      className="hidden xl:block w-[300px] shrink-0"
      aria-label="Upcoming event promotions"
    >
      <div className="sticky top-28 flex flex-col gap-5">
        {rfcVisible ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-green)]">
                Run for Charity · Sep 13
              </p>
              <button
                type="button"
                onClick={dismissRfc}
                className="rounded p-0.5 text-[#8A8F9C] hover:text-[#1A1A1A] hover:bg-black/5"
                aria-label="Dismiss Run for Charity promo"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            <a
              href={BEST_RUNNERS_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl border border-[var(--brand-line)] bg-white shadow-sm hover:shadow-md transition-shadow ring-1 ring-[var(--brand-green)]/20"
            >
              <Image
                src={RUN_FOR_CHARITY_FLYER_IMAGE_PATH}
                alt={`Run for Charity 1K and 5K. Sunday September 13 2026. ${runForCharityPriceLine()}. Tap to register on Best Runners with code SHMS.`}
                width={RAIL_FLYER_WIDTH}
                height={RAIL_FLYER_HEIGHT}
                className="w-full h-auto"
                sizes="300px"
              />
              <span className="block px-3 py-2 text-center text-xs font-bold text-[var(--brand-dark)] bg-[#F4F7F5] border-t border-[var(--border)]">
                Sun Sep 13 · {runForCharityPriceLine()}
              </span>
              <span className="block px-3 py-2.5 text-center text-sm font-bold text-white bg-[var(--brand-green)]">
                Register on Best Runners · SHMS
              </span>
            </a>
          </div>
        ) : null}

        {fffVisible ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c45a00]">
                Fall Family Fest · Sep 25
              </p>
              <button
                type="button"
                onClick={dismissFff}
                className="rounded p-0.5 text-[#8A8F9C] hover:text-[#1A1A1A] hover:bg-black/5"
                aria-label="Dismiss Fall Family Fest promo"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            <Link
              href={FALL_FAMILY_FEST_EVENT_PATH}
              className="block overflow-hidden rounded-xl border-2 border-[#085508]/25 bg-[#fff8e8] shadow-sm hover:opacity-95 transition-opacity"
            >
              <Image
                src={FALL_FAMILY_FEST_FLYER_URL}
                alt="Fall Family Fest flyer — Friday September 25, 5–8 p.m. on the school fields"
                width={300}
                height={169}
                className="w-full h-auto"
                sizes="300px"
              />
              <div className="px-3 py-2.5">
                <p className="text-sm font-bold text-[#085508]">Fri Sep 25 · 5–8 p.m.</p>
                <p className="mt-0.5 text-xs text-[#5A6070] leading-snug">
                  Free inflatables, games, food trucks · siblings welcome
                </p>
                <span className="mt-1.5 inline-block text-xs font-bold text-[var(--brand-green)]">
                  Event details →
                </span>
              </div>
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
