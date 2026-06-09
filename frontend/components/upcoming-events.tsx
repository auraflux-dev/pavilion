import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react'

const events = [
  {
    month: 'Jun',
    day: '10',
    title: 'PTO General Meeting',
    time: '7:00 PM – 8:30 PM',
    location: 'SHMS Media Center',
    description:
      'Join us for our monthly PTO meeting. We will review upcoming events, budget updates, and hear from school administration. All families welcome.',
    category: 'Meeting',
    categoryColor: '#085508',
    categoryBg: '#EEF6EE',
    accent: '#085508',
  },
  {
    month: 'Jun',
    day: '21',
    title: 'End of Year Dance Night',
    time: '6:30 PM – 9:30 PM',
    location: 'SHMS Gymnasium',
    description:
      'Celebrate the end of a fantastic school year at our annual student dance! DJ, refreshments, and plenty of fun. Tickets available at the school store.',
    category: 'Social',
    categoryColor: '#8B1A1A',
    categoryBg: '#FDF0F0',
    accent: '#8B1A1A',
  },
  {
    month: 'Jul',
    day: '12',
    title: 'NOVA Math Tournament',
    time: '9:00 AM – 3:00 PM',
    location: 'Thomas Jefferson High School',
    description:
      'SHMS Stingrays compete in the Northern Virginia Math Tournament. Come cheer on our students as they showcase their math skills against top schools in the region.',
    category: 'Competition',
    categoryColor: '#2A8B7A',
    categoryBg: '#EAF5F3',
    accent: '#2A8B7A',
  },
]

export function UpcomingEvents() {
  return (
    <section
      id="events"
      className="py-20 md:py-28"
      style={{ backgroundColor: '#F3F6FC' }}
      aria-labelledby="events-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: '#8B1A1A', color: 'white' }}
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
            style={{ color: '#085508' }}
          >
            View full calendar
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>

        {/* Event cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((event) => (
            <article
              key={event.title}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col"
            >
              {/* Colored top bar */}
              <div
                className="h-1.5"
                style={{ backgroundColor: event.accent }}
                aria-hidden="true"
              />

              <div className="p-6 flex flex-col flex-1">
                {/* Date badge + category */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm"
                    style={{ backgroundColor: event.accent }}
                    aria-label={`${event.month} ${event.day}`}
                  >
                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                      {event.month}
                    </span>
                    <span className="text-white text-2xl font-bold leading-tight">
                      {event.day}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: event.categoryBg,
                      color: event.categoryColor,
                    }}
                  >
                    {event.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">
                  {event.title}
                </h3>

                <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                  {event.description}
                </p>

                {/* Event meta */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs text-[#5A6070]">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#5A6070]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{event.location}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full font-semibold border-2 hover:text-white transition-colors"
                  style={{
                    borderColor: event.accent,
                    color: event.accent,
                  }}
                  asChild
                >
                  <a href="#events">
                    <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                    Add to Calendar
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
