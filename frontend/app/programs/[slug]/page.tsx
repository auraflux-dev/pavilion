import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProgramLanding } from '@/components/programs/program-landing'
import { getAllPrograms } from '@/lib/api/programs'
import { displayProgramName } from '@/lib/programs/display-name'
import { FALL_2026_EP_CLASSES } from '@/lib/programs/fall-2026-ep'
import { findProgramBySlug } from '@/lib/programs/public-path'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { getSiteSettings } from '@/lib/api/site-settings'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return FALL_2026_EP_CLASSES.map((c) => ({ slug: c.publicSlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const programs = await getAllPrograms().catch(() => [])
  const program = findProgramBySlug(programs, slug)
  if (!program) return { title: 'Program' }
  const title = displayProgramName(program.name)
  const fromCms = String(program.description ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const description =
    fromCms ||
    vanillaizeIfDemo('SHMS PTO enrichment at Stone Hill Middle School')
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(program.image ? { images: [{ url: program.image }] } : {}),
    },
  }
}

export default async function ProgramLandingPage({ params }: Props) {
  const { slug } = await params
  const settings = await getSiteSettings()
  const inSession = settings.getBool('schoolInSession', false)
  if (!inSession) notFound()

  const programs = await getAllPrograms().catch(() => [])
  const program = findProgramBySlug(programs, slug)
  if (!program) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <ProgramLanding program={program} />
      </main>
      <Footer />
    </div>
  )
}
