import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { EventCard } from '@/components/events/event-card'
import { RunForCharityEventDetail } from '@/components/run-for-charity/event-detail'
import { getEventBySlug } from '@/lib/api/events'
import { isRunForCharitySlug } from '@/lib/run-for-charity'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) {
    return { title: 'Event | SHMS PTO' }
  }
  const title = (event.title || 'Event').replace(/\n+/g, ' ')
  const description =
    event.shortDescription ||
    event.description?.slice(0, 160) ||
    'SHMS PTO upcoming event'
  return {
    title: `${title} | SHMS PTO`,
    description,
    openGraph: {
      title,
      description,
      ...(event.mainImage?.url ? { images: [{ url: event.mainImage.url }] } : {}),
    },
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const isRfc = isRunForCharitySlug(slug)

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        {isRfc ? (
          <RunForCharityEventDetail event={event} />
        ) : (
          <section className="py-12 md:py-16">
            <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#085508] mb-8 hover:opacity-80"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                All events
              </Link>
              <EventCard event={event} detailPage />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
