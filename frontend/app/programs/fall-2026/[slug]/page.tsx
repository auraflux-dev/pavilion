import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { ProgramLanding } from '@/components/programs/program-landing'
import {
  loadProgramLandingContext,
  programLandingMetadata,
  programLandingStaticParams,
} from '@/lib/programs/program-landing-route'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export function generateStaticParams() {
  return programLandingStaticParams('fall-2026')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return programLandingMetadata(slug, 'fall-2026')
}

export default async function FallProgramLandingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  const previewToken = typeof sp.programsPreview === 'string' ? sp.programsPreview : null
  const ctx = await loadProgramLandingContext({ slug, season: 'fall-2026', previewToken })
  if (!ctx) notFound()

  return (
    <VisitorChrome pageKey={ctx.pageKey} mainStyle={{ backgroundColor: 'var(--brand-warm)' }}>
      <ProgramLanding
        program={ctx.program}
        companion={ctx.companion}
        landingCopy={ctx.landingCopy}
      />
    </VisitorChrome>
  )
}
