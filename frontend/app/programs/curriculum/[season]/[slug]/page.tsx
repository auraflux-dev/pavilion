import { notFound } from 'next/navigation'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProgramCurriculumDoc } from '@/components/programs/program-curriculum-doc'
import { resolveCurriculumShare, curriculumShareEntries } from '@/lib/programs/curriculum-share'
import type { Metadata } from 'next'

export const revalidate = 300

interface Props {
  params: Promise<{ season: string; slug: string }>
}

export function generateStaticParams() {
  return curriculumShareEntries().map((e) => ({ season: e.season, slug: e.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { season, slug } = await params
  const doc = resolveCurriculumShare(season, slug)
  if (!doc) return { title: 'Curriculum' }
  return {
    title: `${doc.programName} curriculum · ${doc.seasonLabel}`,
    description: `${doc.copy.curriculumTitle}. Twelve sessions.`,
  }
}

export default async function ProgramCurriculumSharePage({ params }: Props) {
  const { season, slug } = await params
  const doc = resolveCurriculumShare(season, slug)
  if (!doc) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ProgramCurriculumDoc doc={doc} />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
