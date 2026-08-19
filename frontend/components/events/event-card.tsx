'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ExternalLink, Link2, MapPin, Ticket } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import {
  earlyBirdCallout,
  eventPublicPath,
  type WixEvent,
} from '@/lib/api/events'

interface EventCardProps {
  event: WixEvent
  /** When true, title is plain text (detail page already is the share URL). */
  detailPage?: boolean
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  'PTO led': { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  'SHMS led': { bg: '#E8F0FE', text: '#1A56A8', accent: '#1A56A8' },
  'PTO/SHMS': { bg: '#FFF4E5', text: '#9A5B00', accent: '#9A5B00' },
  Meeting: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Social: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Competition: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Fundraiser: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  Workshop: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
  default: { bg: 'var(--brand-soft)', text: 'var(--brand-green)', accent: 'var(--brand-green)' },
}

function getColors(tags?: string[]) {
  if (!tags?.length) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[tags[0]] ?? CATEGORY_COLORS.default
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { month: 'n/a', day: 'n/a', time: '' }
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

function sameOriginPath(url: string): string | null {
  try {
    const u = new URL(url, 'https://www.shmspto.org')
    if (
      u.hostname === 'www.shmspto.org' ||
      u.hostname === 'shmspto.org' ||
      u.hostname === 'localhost'
    ) {
      return `${u.pathname}${u.search}${u.hash}`
    }
  } catch {
    /* ignore */
  }
  return null
}

export function EventCard({ event, detailPage = false }: EventCardProps) {
  const colors = getColors(event.tags)
  const { month, day, time } = formatDate(event.dateAndTimeSettings?.startDate)
  const endTime = formatDate(event.dateAndTimeSettings?.endDate).time
  const ticket = event.ticket
  const [qty, setQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const remaining =
    ticket && ticket.capacity > 0 ? Math.max(0, ticket.capacity - ticket.soldCount) : null
  const canBuy =
    Boolean(ticket?.onSale && ticket.price > 0 && event.id) &&
    (remaining == null || remaining > 0)
  const total = ticket ? ticket.price * qty : 0
  const path = eventPublicPath(event)
  const earlyBird = earlyBirdCallout(event.shortDescription) || earlyBirdCallout(event.description)
  const registerHref = event.externalRegistrationUrl
  const registerLocal = registerHref ? sameOriginPath(registerHref) : null
  const anchorId = String(event.slug || event.id || '').trim() || undefined

  async function copyShareLink() {
    if (!path || typeof window === 'undefined') return
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const titleEl = (
    <h3 className="text-lg font-bold text-[#1A1A1A] mb-3 whitespace-pre-line">
      {event.title}
    </h3>
  )

  const flyerImg = event.mainImage?.url ? (
    <img
      src={event.mainImage.url}
      alt={event.title?.replace(/\n+/g, ' ') ?? 'Event flyer'}
      className="w-full h-auto object-contain"
    />
  ) : null

  const flyerCta =
    flyerImg && registerLocal ? (
      <Link
        href={registerLocal}
        className="block rounded-xl overflow-hidden border border-[var(--border)] hover:opacity-95 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: colors.accent }}
        aria-label="Register — open flyer link"
      >
        {flyerImg}
      </Link>
    ) : flyerImg && registerHref ? (
      <a
        href={registerHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-[var(--border)] hover:opacity-95 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: colors.accent }}
        aria-label="Register — open flyer link"
      >
        {flyerImg}
      </a>
    ) : flyerImg ? (
      <div className="rounded-xl overflow-hidden border border-[var(--border)]">{flyerImg}</div>
    ) : !event.mainImage?.url ? (
      <div
        className="h-24 w-full flex items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.bg }}
        aria-hidden="true"
      >
        <span className="text-xs font-semibold" style={{ color: colors.text }}>
          Flyer coming soon
        </span>
      </div>
    ) : null

  return (
    <article
      id={anchorId}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col scroll-mt-24"
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-5">
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: colors.accent }}
            aria-label={`${month} ${day}`}
          >
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
              {month}
            </span>
            <span className="text-white text-2xl font-bold leading-tight">{day}</span>
          </div>
          {event.tags?.[0] && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {event.tags[0]}
            </span>
          )}
        </div>

        {detailPage || !path ? (
          titleEl
        ) : (
          <Link href={path} className="hover:opacity-80 transition-opacity">
            {titleEl}
          </Link>
        )}

        {earlyBird ? (
          <p
            className="text-sm font-semibold leading-relaxed mb-3 px-3 py-2.5 rounded-lg whitespace-pre-line"
            style={{ backgroundColor: '#FFF4E5', color: '#9A5B00' }}
          >
            {earlyBird}
          </p>
        ) : null}

        {event.description && (
          <p
            className={`text-sm text-[#5A6070] leading-relaxed mb-5 ${
              detailPage ? '' : 'line-clamp-3'
            }`}
          >
            {event.description}
          </p>
        )}

        <div className="space-y-2 mb-6">
          {time && (
            <div className="flex items-center gap-2 text-xs text-[#5A6070]">
              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {time}
                {endTime ? ` to ${endTime}` : ''}
              </span>
            </div>
          )}
          {event.location?.name && (
            <div className="flex items-center gap-2 text-xs text-[#5A6070]">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{event.location.name}</span>
            </div>
          )}
          {canBuy ? (
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: colors.accent }}>
              <Ticket className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                ${ticket!.price.toFixed(2)} / ticket
                {remaining != null ? ` · ${remaining} left` : ''}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          {canBuy ? (
            <>
              <label className="flex items-center justify-between gap-2 text-xs text-[#5A6070]">
                Quantity
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="border border-[var(--border)] rounded-lg px-2 py-1"
                >
                  {Array.from({ length: Math.min(10, remaining ?? 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <MemberGate label={`Buy tickets · $${total.toFixed(2)}`}>
                <Button
                  className="w-full text-white font-semibold"
                  style={{ backgroundColor: colors.accent }}
                  onClick={() => setCheckoutOpen(true)}
                >
                  Buy tickets · ${total.toFixed(2)}
                </Button>
              </MemberGate>
              <PortalCardCheckout
                open={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                amount={total}
                title={(event.title || 'Event tickets').replace(/\n+/g, ' ')}
                subtitle={`${qty} ticket${qty === 1 ? '' : 's'} · $${ticket!.price.toFixed(2)} each`}
                payBody={{ kind: 'event', eventId: event.id!, quantity: qty }}
                containerId={`event-pay-${event.id}`}
                onPaid={() => setCheckoutOpen(false)}
              />
            </>
          ) : null}
          {!canBuy && registerHref ? (
            <Button
              className="w-full text-white font-semibold"
              style={{ backgroundColor: colors.accent }}
              asChild
            >
              {registerLocal ? (
                <Link href={registerLocal}>Register</Link>
              ) : (
                <a href={registerHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                  Register
                </a>
              )}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="w-full font-semibold border-2 hover:text-white transition-colors"
            style={{ borderColor: colors.accent, color: colors.accent }}
            asChild
          >
            <a href={buildCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
              <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
              Add to Calendar
            </a>
          </Button>
          {path ? (
            <Button
              type="button"
              variant="outline"
              className="w-full font-semibold border-2"
              style={{ borderColor: '#C4BAA8', color: '#3D4450' }}
              onClick={copyShareLink}
            >
              <Link2 className="w-4 h-4 mr-2" aria-hidden="true" />
              {copied ? 'Link copied' : 'Copy event link'}
            </Button>
          ) : null}
        </div>

        {flyerCta ? <div className="mt-5">{flyerCta}</div> : null}
      </div>
    </article>
  )
}
