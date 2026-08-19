'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, ExternalLink, Link2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  earlyBirdCallout,
  eventPublicPath,
  type WixEvent,
} from '@/lib/api/events'
import {
  BEST_RUNNERS_SIGNUP_URL,
  RUN_FOR_CHARITY_FLYER_PDF_URL,
} from '@/lib/run-for-charity'

function formatDate(dateStr?: string) {
  if (!dateStr) return { month: 'n/a', day: 'n/a', time: '', weekday: '' }
  const d = new Date(dateStr)
  const tz = 'America/New_York'
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: tz }).toUpperCase(),
    day: String(d.toLocaleString('en-US', { day: 'numeric', timeZone: tz })),
    time: d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    }),
    weekday: d.toLocaleString('en-US', { weekday: 'long', timeZone: tz }),
  }
}

function buildCalendarUrl(event: WixEvent) {
  const start = event.dateAndTimeSettings?.startDate ?? ''
  const end = event.dateAndTimeSettings?.endDate ?? start
  const title = encodeURIComponent((event.title ?? '').replace(/\n+/g, ' '))
  const location = encodeURIComponent(event.location?.name ?? '')
  const fmt = (d: string) => String(d).replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${location}`
}

/** Landing: register on Best Runners (SHMS is already on the signup URL). */
export function RunForCharityEventDetail({ event }: { event: WixEvent }) {
  const { month, day, time, weekday } = formatDate(event.dateAndTimeSettings?.startDate)
  const endTime = formatDate(event.dateAndTimeSettings?.endDate).time
  const earlyBird =
    earlyBirdCallout(event.shortDescription) || earlyBirdCallout(event.description)
  const path = eventPublicPath(event)
  const [copiedLink, setCopiedLink] = useState(false)

  const brief =
    (event.description || '')
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^register\b/i.test(l) && !/^https?:\/\//i.test(l))
      .slice(0, 2)
      .join(' ') ||
    'Best Runners 1K & 5K for families — our register link applies school code SHMS so Stone Hill receives the registration fees.'

  async function copyShareLink() {
    if (!path || typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      /* ignore */
    }
  }

  function openBestRunners() {
    window.open(BEST_RUNNERS_SIGNUP_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden border-b border-[#D9D2C5]"
        style={{
          background:
            'linear-gradient(165deg, var(--brand-warm) 0%, #E8F0E4 45%, var(--brand-warm) 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 60% at 85% 10%, rgba(8,85,8,0.14) 0%, transparent 55%)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green)] hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            All events
          </Link>

          <header className="max-w-3xl space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-green)]">
              SHMS PTO · Best Runners partnership
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--brand-green)' }}
                aria-label={`${month} ${day}`}
              >
                <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                  {month}
                </span>
                <span className="text-white text-2xl font-bold leading-tight">{day}</span>
              </div>
              <div className="text-sm text-[#5A6070]">
                <p className="font-semibold text-[#1A1A1A]">
                  {weekday}
                  {time ? ` · ${time}${endTime ? `–${endTime}` : ''}` : ''}
                </p>
                {event.location?.name ? (
                  <p className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {event.location.name}
                  </p>
                ) : null}
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[var(--brand-dark)] tracking-tight whitespace-pre-line text-balance leading-[1.15]">
              {event.title}
            </h1>

            {earlyBird ? (
              <p
                className="inline-block text-sm sm:text-base font-bold leading-relaxed px-4 py-3 rounded-xl whitespace-pre-line border-2"
                style={{
                  backgroundColor: '#FFF4E5',
                  color: '#7A4200',
                  borderColor: '#9A5B00',
                }}
              >
                {earlyBird}
              </p>
            ) : null}

            <p className="text-base sm:text-lg text-[#3D4450] leading-relaxed text-pretty">
              {brief}
            </p>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-[var(--brand-green)]">
              <a
                href={buildCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline underline-offset-2"
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Add to calendar
              </a>
              {path ? (
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex items-center gap-1.5 hover:underline underline-offset-2"
                >
                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {copiedLink ? 'Link copied' : 'Copy event link'}
                </button>
              ) : null}
            </p>
          </header>

          <div
            id="register"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start scroll-mt-28 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100"
          >
            <div className="lg:col-span-5 space-y-5">
              <div>
                <h2
                  id="rfc-register-heading"
                  className="text-xl sm:text-2xl font-bold text-[#1A1A1A]"
                >
                  Run for Charity registration
                </h2>
                <p className="mt-2 text-sm sm:text-base text-[#5A6070] leading-relaxed">
                  Best Runners runs the race. Tap register — the link fills in school
                  code SHMS so Stone Hill gets the registration fees.
                </p>
              </div>

              <Button
                type="button"
                className="w-full text-white font-bold text-base py-6"
                style={{ backgroundColor: 'var(--brand-dark)' }}
                onClick={openBestRunners}
              >
                <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                Register on Best Runners
              </Button>
              <p className="text-xs text-center text-[#5A6070] leading-relaxed">
                Adults $30 · Kids $20 · medal, race shirt, post-race snacks
              </p>
              <p className="text-center">
                <a
                  href={RUN_FOR_CHARITY_FLYER_PDF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[var(--brand-green)] hover:underline underline-offset-2"
                >
                  Download flyer
                </a>
              </p>
            </div>

            {event.mainImage?.url ? (
              <div className="lg:col-span-7">
                <button
                  type="button"
                  onClick={openBestRunners}
                  className="block w-full text-left overflow-hidden rounded-2xl shadow-[0_24px_48px_-28px_rgba(11,61,11,0.45)] ring-2 ring-[var(--brand-dark)] bg-white hover:opacity-[0.98] transition-opacity cursor-pointer"
                >
                  <p
                    className="px-4 py-4 text-center text-base sm:text-lg font-bold tracking-wide text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--brand-dark)' }}
                  >
                    <ExternalLink className="w-5 h-5 shrink-0" aria-hidden="true" />
                    Official flyer · tap to register on Best Runners
                  </p>
                  <img
                    src={event.mainImage.url}
                    alt={event.title?.replace(/\n+/g, ' ') ?? 'Run for Charity flyer'}
                    className="w-full h-auto object-contain"
                  />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
