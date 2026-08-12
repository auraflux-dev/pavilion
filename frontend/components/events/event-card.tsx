'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ExternalLink, MapPin, Ticket } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import type { WixEvent } from '@/lib/api/events'

interface EventCardProps {
  event: WixEvent
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  'PTO led': { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  'SHMS led': { bg: '#E8F0FE', text: '#1A56A8', accent: '#1A56A8' },
  'PTO/SHMS': { bg: '#FFF4E5', text: '#9A5B00', accent: '#9A5B00' },
  Meeting: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Social: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Competition: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Fundraiser: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  Workshop: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  default: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
}

function getColors(tags?: string[]) {
  if (!tags?.length) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[tags[0]] ?? CATEGORY_COLORS.default
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { month: 'n/a', day: 'n/a', time: '' }
  const d = new Date(dateStr)
  return {
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    time: d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

function buildCalendarUrl(event: WixEvent) {
  const start = event.dateAndTimeSettings?.startDate ?? ''
  const end = event.dateAndTimeSettings?.endDate ?? start
  const title = encodeURIComponent(event.title ?? '')
  const location = encodeURIComponent(event.location?.name ?? '')
  const fmt = (d: string) => String(d).replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${location}`
}

export function EventCard({ event }: EventCardProps) {
  const colors = getColors(event.tags)
  const { month, day, time } = formatDate(event.dateAndTimeSettings?.startDate)
  const endTime = formatDate(event.dateAndTimeSettings?.endDate).time
  const ticket = event.ticket
  const [qty, setQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const remaining =
    ticket && ticket.capacity > 0 ? Math.max(0, ticket.capacity - ticket.soldCount) : null
  const canBuy =
    Boolean(ticket?.onSale && ticket.price > 0 && event.id) &&
    (remaining == null || remaining > 0)
  const total = ticket ? ticket.price * qty : 0

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      {event.mainImage?.url ? (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={event.mainImage.url}
            alt={event.title ?? 'Event'}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-28 w-full flex items-center justify-center"
          style={{ backgroundColor: colors.bg }}
          aria-hidden="true"
        >
          <span className="text-xs font-semibold" style={{ color: colors.text }}>
            Flyer coming soon
          </span>
        </div>
      )}

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

        <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">{event.title}</h3>

        {event.description && (
          <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1 line-clamp-3">
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

        <div className="space-y-2 mt-auto">
          {canBuy ? (
            <>
              <label className="flex items-center justify-between gap-2 text-xs text-[#5A6070]">
                Quantity
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="border border-[#E8E4DC] rounded-lg px-2 py-1"
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
                title={event.title || 'Event tickets'}
                subtitle={`${qty} ticket${qty === 1 ? '' : 's'} · $${ticket!.price.toFixed(2)} each`}
                payBody={{ kind: 'event', eventId: event.id!, quantity: qty }}
                containerId={`event-pay-${event.id}`}
                onPaid={() => setCheckoutOpen(false)}
              />
            </>
          ) : null}
          {!canBuy && event.externalRegistrationUrl ? (
            <Button
              className="w-full text-white font-semibold"
              style={{ backgroundColor: colors.accent }}
              asChild
            >
              <a
                href={event.externalRegistrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                Register
              </a>
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
        </div>
      </div>
    </article>
  )
}
