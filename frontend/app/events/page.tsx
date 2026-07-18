import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { EventCard } from '@/components/events/event-card'
import { PageHero } from '@/components/page-hero'
import { getUpcomingEvents, type WixEvent } from '@/lib/api/events'
import { getPageContent } from '@/lib/api/page-content'
import { Calendar, ArrowRight } from 'lucide-react'

export const revalidate = 300

export default async function EventsPage() {
  let events: WixEvent[] = []
  let error = false
  const [{ getSiteSettings }, page] = await Promise.all([
    import('@/lib/api/site-settings'),
    getPageContent('events'),
  ])
  const settings = await getSiteSettings()
  const inSession = settings.getBool('schoolInSession', false)

  try {
    events = inSession ? await getUpcomingEvents(24) : []
  } catch {
    error = true
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero
          content={{
            ...page,
            ...(inSession
              ? {}
              : {
                  eyebrow: 'Off season',
                  title: 'Events resume with the school year',
                  body: 'No public events are scheduled while school is out of session. Membership and The Cove stay open year-round.',
                  ctaLabel: 'Shop The Cove',
                  ctaHref: '/cove',
                }),
          }}
        />

        {/* Events grid */}
        <section
          className="py-16 md:py-24"
          style={{ backgroundColor: '#F5F0E8' }}
          aria-labelledby="events-list-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="events-list-heading" className="sr-only">All Events</h2>

            {error && (
              <div className="text-center py-16">
                <p className="text-[#5A6070] text-lg">
                  Unable to load events right now. Please try again later.
                </p>
              </div>
            )}

            {!error && events.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-[#C4BAA8]" />
                <p className="text-[#5A6070] text-lg font-medium">No upcoming events scheduled.</p>
                <p className="text-[#5A6070] text-sm mt-2">Check back soon — events are added regularly.</p>
              </div>
            )}

            {!error && events.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Subscribe CTA */}
        <section className="py-14 bg-white border-t border-[#E8E4DC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              Never miss an event
            </h2>
            <p className="text-[#5A6070] mb-6 max-w-xl mx-auto">
              Subscribe to our newsletter and get event reminders delivered straight to your inbox.
            </p>
            <a
              href="/newsletter"
              className="inline-flex items-center gap-2 font-semibold text-white px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#085508' }}
            >
              Subscribe to Newsletter
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
