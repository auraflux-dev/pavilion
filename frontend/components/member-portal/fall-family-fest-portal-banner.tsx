'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  FALL_FAMILY_FEST_EVENT_PATH,
  FALL_FAMILY_FEST_FLYER_URL,
  stillShowingFallFamilyFest,
} from '@/lib/fall-family-fest'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { isDemoInstance } from '@/lib/demo/instance'

const DISMISS_KEY = 'shms-fff-portal-banner-dismissed'

/**
 * Compact Fall Family Fest promo for member portal home on &lt;xl viewports.
 * On xl+, the sticky right rail shows FFF under Run for Charity instead.
 */
export function FallFamilyFestPortalBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isDemoInstance() || isCommonsPlatform()) return
    if (!stillShowingFallFamilyFest()) return
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    } catch {
      /* ignore */
    }
    setVisible(true)
  }, [])

  if (!visible) return null

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div className="xl:hidden mb-5 rounded-2xl border-2 border-[#085508]/25 bg-[#fff8e8] overflow-hidden shadow-sm">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c45a00]">
          Fall Family Fest · Sep 25
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-0.5 text-[#8A8F9C] hover:text-[#1A1A1A] hover:bg-black/5"
          aria-label="Dismiss Fall Family Fest promo"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
      <Link
        href={FALL_FAMILY_FEST_EVENT_PATH}
        className="grid grid-cols-[1fr_120px] gap-2.5 px-3 pb-3 items-center hover:opacity-95 transition-opacity"
      >
        <div>
          <p className="text-base font-bold text-[#085508]">Fri Sep 25 · 5–8 p.m.</p>
          <p className="mt-0.5 text-xs text-[#5A6070] leading-snug">
            School fields · free inflatables, games · food trucks · siblings welcome.
          </p>
          <span className="mt-1.5 inline-block text-xs font-bold text-[var(--brand-green)]">
            See event details →
          </span>
        </div>
        <Image
          src={FALL_FAMILY_FEST_FLYER_URL}
          alt=""
          width={240}
          height={135}
          className="w-full h-auto rounded-lg border border-[#085508]/20"
          sizes="120px"
        />
      </Link>
    </div>
  )
}
