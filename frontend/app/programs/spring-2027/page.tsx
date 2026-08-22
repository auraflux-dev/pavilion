import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { notFound } from 'next/navigation'
import { Spring2027EpSchedule } from '@/components/programs/spring-2027-ep-schedule'
import { ProgramsPreviewBanner } from '@/components/programs/programs-preview-banner'
import {
  isSpringCatalogListed,
  SPRING_CATALOG_ENABLED,
} from '@/lib/programs/season'
import { spring2027PacketScheduleRows } from '@/lib/programs/spring-2027-ep'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spring 2027 Enrichment Schedule | SHMS PTO',
  description: 'Spring 2027 enrichment at Stone Hill. Placeholder nights for review.',
}

export const revalidate = 300

export default async function Spring2027EpSchedulePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = searchParams ? await searchParams : {}
  const previewToken = typeof sp.programsPreview === 'string' ? sp.programsPreview : null
  const { canViewProgramsCatalogNow, isProgramsReviewHost } = await import(
    '@/lib/programs/public-access'
  )
  const access = await canViewProgramsCatalogNow({ previewToken })
  const reviewHost = await isProgramsReviewHost()
  if (!access.allowed) notFound()
  if (!isSpringCatalogListed({ reviewHost })) notFound()

  const rows = spring2027PacketScheduleRows()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
        {access.previewMode || !SPRING_CATALOG_ENABLED ? <ProgramsPreviewBanner /> : null}
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Spring2027EpSchedule
            rows={rows}
            footnote={
              reviewHost && !SPRING_CATALOG_ENABLED
                ? 'Staging / Preview only.\nwww parents do not see Spring until SPRING_CATALOG_ENABLED is flipped.'
                : undefined
            }
          />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
