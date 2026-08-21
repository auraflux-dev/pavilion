import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { notFound } from 'next/navigation'
import { Fall2026EpSchedule } from '@/components/programs/fall-2026-ep-schedule'
import { ProgramsPreviewBanner } from '@/components/programs/programs-preview-banner'
import { getAllPrograms } from '@/lib/api/programs'
import { selectCurrentFall2026Programs } from '@/lib/programs/fall-2026-ep'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fall 2026 Enrichment Schedule | SHMS PTO',
  description:
    'Fall 2026 enrichment at Stone Hill. Share with instructors.',
}

export const revalidate = 300

export default async function Fall2026EpSchedulePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = searchParams ? await searchParams : {}
  const previewToken = typeof sp.programsPreview === 'string' ? sp.programsPreview : null
  const { canViewProgramsCatalogNow } = await import('@/lib/programs/public-access')
  const access = await canViewProgramsCatalogNow({ previewToken })
  if (!access.allowed) notFound()
  const all = await getAllPrograms().catch(() => [])
  const current = selectCurrentFall2026Programs(
    all.map((p) => ({
      id: p._id,
      name: p.name,
      fallEpClassId: p.fallEpClassId ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      registrationOpen: p.registrationOpen,
      featured: p.featured === true,
      dayOfWeek: p.dayOfWeek ?? '',
      classTime: p.classTime ?? '',
      instructorName: p.instructorName ?? '',
      location: p.location ?? '',
      meetingDates: p.meetingDates ?? '',
      skipsNote: p.skipsNote ?? '',
    })),
  )

  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
        {access.previewMode ? <ProgramsPreviewBanner /> : null}
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Fall2026EpSchedule variant="public" programs={current} />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
