import { EventsFilter } from '@/components/events/events-filter'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { PageHero } from '@/components/page-hero'
import { DepartmentContactForm } from '@/components/programs/programs-contact-form'
import { ProgramUiCopyBoundary } from '@/components/programs/program-ui-copy-boundary'
import { getUpcomingEvents, type WixEvent } from '@/lib/api/events'
import { getPageContent } from '@/lib/api/page-content'
import { getEventsPageCopy } from '@/lib/api/visitor-forms-copy'
import { formString } from '@/lib/copy/form-string'
import { Calendar, ArrowRight } from 'lucide-react'
import { EventsSectionNav } from '@/components/jump-nav/public-section-navs'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

export const revalidate = 300

export default async function EventsPage() {
  let events: WixEvent[] = []
  let error = false
  const [{ getSiteSettings }, page, eventsCopy] = await Promise.all([
    import('@/lib/api/site-settings'),
    getPageContent('events'),
    getEventsPageCopy(),
  ])
  const es = (key: string) => vanillaizeIfDemo(formString(eventsCopy, key, key))
  const settings = await getSiteSettings()
  const inSession = settings.getBool('schoolInSession', false)
  const eventsEmail = settings.get('contactEmailEvents', 'vp-community-events@shmspto.org')

  try {
    events = inSession ? await getUpcomingEvents(24) : []
  } catch {
    error = true
  }

  return (
    <VisitorChrome pageKey="events">
        <PageHero
          pageKey="events"
          content={{
            ...page,
            ...(inSession
              ? {}
              : {
                  eyebrow: 'Off season',
                  title: 'Events resume with the school year',
                  body: vanillaizeIfDemo(
                    'No public events are scheduled while school is out of session. Membership and The Cove stay open year-round.',
                  ),
                  ctaLabel: vanillaizeIfDemo('Shop The Cove'),
                  ctaHref: '/cove',
                }),
          }}
        />
        <EventsSectionNav />

        <section
          id="events-list"
          className="scroll-mt-28 py-16 md:py-24"
          style={{ backgroundColor: 'var(--brand-warm)' }}
          aria-labelledby="events-list-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="events-list-heading" className="sr-only">{es('list.heading')}</h2>

            {error && (
              <div className="text-center py-16">
                <p className="text-[#5A6070] text-lg whitespace-pre-line">
                  {es('list.loadError')}
                </p>
              </div>
            )}

            {!error && events.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-[#C4BAA8]" />
                <p className="text-[#5A6070] text-lg font-medium whitespace-pre-line">{es('list.emptyTitle')}</p>
                <p className="text-[#5A6070] text-sm mt-2 whitespace-pre-line">{es('list.emptyBody')}</p>
              </div>
            )}

            {!error && events.length > 0 && <EventsFilter events={events} />}
          </div>
        </section>

        <section
          id="event-ideas"
          className="scroll-mt-28 border-t border-[var(--border)] bg-white py-14 md:py-20"
          aria-labelledby="event-ideas-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2
                id="event-ideas-heading"
                className="mb-3 text-2xl font-bold text-[#1A1A1A] sm:text-3xl"
              >
                {es('ideas.title')}
              </h2>
              <p className="mx-auto max-w-xl text-[#5A6070] whitespace-pre-line">
                {es('ideas.intro')}
              </p>
            </div>
            <ProgramUiCopyBoundary>
              <DepartmentContactForm toEmail={eventsEmail} variant="events" />
            </ProgramUiCopyBoundary>
          </div>
        </section>

        <section id="newsletter" className="scroll-mt-28 py-14 bg-white border-t border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              {es('newsletter.title')}
            </h2>
            <p className="text-[#5A6070] mb-6 max-w-xl mx-auto whitespace-pre-line">
              {es('newsletter.body')}
            </p>
            <a
              href="/newsletter"
              className="inline-flex items-center gap-2 font-semibold text-white px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {es('newsletter.cta')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
    </VisitorChrome>
  )
}
