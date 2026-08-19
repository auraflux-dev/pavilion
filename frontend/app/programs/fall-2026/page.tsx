import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Fall2026EpSchedule } from '@/components/programs/fall-2026-ep-schedule'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fall 2026 Enrichment Schedule | SHMS PTO',
  description:
    'Fall 2026 enrichment at Stone Hill: Tuesdays and Wednesdays in the library, 12 sessions each. Share with instructors.',
}

export default function Fall2026EpSchedulePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Fall2026EpSchedule variant="public" />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
