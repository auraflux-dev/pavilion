import { VisitorChrome } from '@/components/site/visitor-chrome'
import { Hero } from '@/components/hero'
import { RunForCharityPromo } from '@/components/run-for-charity-promo'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { ProgramsPreview } from '@/components/programs-preview'
import { VolunteerSection } from '@/components/volunteer-section'
import { UpcomingEvents } from '@/components/upcoming-events'
import { CommunityBanner } from '@/components/community-banner'
import { DonateBlock } from '@/components/donate/donate-block'
import { HomeSectionNav } from '@/components/jump-nav/public-section-navs'
import { isSchoolInSession } from '@/lib/api/visitor-season'
import { isDemoInstance } from '@/lib/demo/instance'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { canViewProgramsCatalogNow, isProgramsReviewHost } from '@/lib/programs/public-access'
import { isProgramsCatalogListed } from '@/lib/programs/public-catalog'
import { getPageStrings } from '@/lib/api/page-strings'
import { pickString } from '@/lib/api/page-strings-shared'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'
import { getPageSections } from '@/lib/api/page-sections'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'

/** Request-time so demo page builder sections can seed/render (not frozen at build). */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const composed = await getPageSections('home')
  if (composed?.length) {
    return (
      <VisitorChrome pageKey="home">
        <PageSectionsRenderer sections={composed} />
      </VisitorChrome>
    )
  }

  const inSession = await isSchoolInSession()
  const programsAccess = await canViewProgramsCatalogNow()
  const reviewHost = await isProgramsReviewHost()
  const programsPublic =
    isProgramsCatalogListed({
      inSession,
      access: programsAccess,
      reviewHost,
    }) && !programsAccess.previewMode
  const demo = isDemoInstance()
  const commons = isPavilionProductPlatform()
  const homeStrings = await getPageStrings('home-strings')

  const videoBody = commons
    ? 'Private trial. Sign in to tour membership, events, and board tools for your school.'
    : demo
      ? `See how families use the ${DEMO_BRAND.short} site for membership, the ${DEMO_BRAND.card}, and ${DEMO_BRAND.store}.`
      : pickString(homeStrings, 'video.body', 'See how families use shmspto.org for membership, The Cove Digital Card, and more.')

  const donateTitle = commons
    ? 'Donate'
    : demo
      ? `Donate to ${DEMO_BRAND.short}`
      : pickString(homeStrings, 'donate.compact.title', 'Donate to SHMS PTO')

  const donateBody = commons
    ? 'Direct donations support programs and events. Checkout stays off until Square is connected.'
    : demo
      ? `Any amount helps ${DEMO_BRAND.short} fund enrichment, ${DEMO_BRAND.store}, and events for ${DEMO_BRAND.school} students.`
      : pickString(
          homeStrings,
          'donate.compact.body',
          'Any amount helps the PTO fund enrichment, The Cove, and events for Stone Hill students.',
        )

  return (
    <VisitorChrome pageKey="home">
      <Hero />
      {demo || commons ? null : <RunForCharityPromo />}
      <ParentVideoSection
        videoId="parent-tour"
        id="parent-tour"
        eyebrow={pickString(homeStrings, 'video.eyebrow', 'New this year')}
        title={pickString(homeStrings, 'video.title', 'Take a 3-minute website tour')}
        body={videoBody}
        background="#FFFFFF"
      />
      <HomeSectionNav showPrograms={programsPublic && !commons} showEvents={inSession} />
      {programsPublic && !commons ? <ProgramsPreview /> : null}
      <VolunteerSection />
      {inSession ? <UpcomingEvents /> : null}
      <DonateBlock
        compact
        eyebrow={commons ? 'Support the PTO' : undefined}
        title={donateTitle}
        body={donateBody}
      />
      <CommunityBanner />
    </VisitorChrome>
  )
}
