import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react'
import { getUpcomingEvents } from '@/lib/api/events'

function formatEventDate(startDate?: string): { month: string; day: string; time: string } {
  if (!startDate) return { month: 'n/a', day: 'n/a', time: '' }
  const d = new Date(startDate)
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: 'America/New_York' }),
    day:   d.toLocaleString('en-US', { day: 'numeric', timeZone: 'America/New_York' }),
    time:  d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }),
  }
}

function formatTimeRange(startDate?: string, endDate?: string): string {
  if (!startDate) return ''
  const start = new Date(startDate)
  const startStr = start.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  if (!endDate) return startStr
  const end = new Date(endDate)
  const endStr = end.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  return `${startStr} to ${endStr}`
}

export async function UpcomingEvents() {
  const events = await getUpcomingEvents(3)
  if (events.length === 0) return null

  return (
    <section
      id="events"
      className="scroll-mt-28 py-20 md:py-28"
      style={{ backgroundColor: 'var(--brand-warm)' }}
      aria-labelledby="events-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: 'var(--brand-green)', color: 'white' }}
            >
              Mark Your Calendar
            </div>
            <h2
              id="events-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance"
              style={{ color: '#1A1A1A' }}
            >
              Upcoming Events
            </h2>
          </div>
          <a
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold shrink-0 hover:underline underline-offset-4"
            style={{ color: 'var(--brand-green)' }}
          >
            View full calendar
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>

        {/* Event cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((event) => {
            const { month, day } = formatEventDate(event.dateAndTimeSettings?.startDate)
            const timeRange = formatTimeRange(event.dateAndTimeSettings?.startDate, event.dateAndTimeSettings?.endDate)
            const category = event.tags?.[0] ?? 'Event'

            return (
              <article
                key={event.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col"
              >
                {/* Colored top bar */}
                <div
                  className="h-1.5"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                  aria-hidden="true"
                />

                <div className="p-6 flex flex-col flex-1">
                  {/* Date badge + category */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                      aria-label={`${month} ${day}`}
                    >
                      <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                        {month}
                      </span>
                      <span className="text-white text-2xl font-bold leading-tight">
                        {day}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
                    >
                      {category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">
                    {event.title}
                  </h3>

                  <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                    {event.description ?? 'Check back for more details.'}
                  </p>

                  {/* Event meta */}
                  <div className="space-y-2 mb-6">
                    {timeRange && (
                      <div className="flex items-center gap-2 text-xs text-[#5A6070]">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{timeRange}</span>
                      </div>
                    )}
                    {event.location?.name && (
                      <div className="flex items-center gap-2 text-xs text-[#5A6070]">
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{event.location.name}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full font-semibold border-2 hover:text-white transition-colors"
                    style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
                    asChild
                  >
                    <a href="/events">
                      <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                      View Details
                    </a>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
