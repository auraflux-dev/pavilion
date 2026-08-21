import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { RunForCharityPromo } from '@/components/run-for-charity-promo'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { ProgramsPreview } from '@/components/programs-preview'
import { VolunteerSection } from '@/components/volunteer-section'
import { UpcomingEvents } from '@/components/upcoming-events'
import { CommunityBanner } from '@/components/community-banner'
import { Footer } from '@/components/footer'
import { DonateBlock } from '@/components/donate/donate-block'
import { HomeSectionNav } from '@/components/jump-nav/public-section-navs'
import { isSchoolInSession } from '@/lib/api/visitor-season'
import { isDemoInstance } from '@/lib/demo/instance'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isPublicProgramsCatalogOpen } from '@/lib/programs/season'

export default async function HomePage() {
  const inSession = await isSchoolInSession()
  const programsPublic = inSession && isPublicProgramsCatalogOpen()
  const demo = isDemoInstance()
  const commons = process.env.COMMONS_PLATFORM === 'true'

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Hero />
        {demo || commons ? null : <RunForCharityPromo />}
        <ParentVideoSection
          videoId="parent-tour"
          id="parent-tour"
          eyebrow="New this year"
          title="Take a 3-minute website tour"
          body={
            commons
              ? 'Private trial. Sign in to tour membership, events, and board tools for your school.'
              : demo
              ? `See how families use the ${DEMO_BRAND.short} site for membership, the ${DEMO_BRAND.card}, and ${DEMO_BRAND.store}.`
              : 'See how families use shmspto.org for membership, The Cove Digital Card, and more.'
          }
          background="#FFFFFF"
        />
        <HomeSectionNav showPrograms={programsPublic && !commons} showEvents={inSession} />
        {programsPublic && !commons ? <ProgramsPreview /> : null}
        <VolunteerSection />
        {inSession ? <UpcomingEvents /> : null}
        <DonateBlock
          compact
          eyebrow={commons ? 'Support the PTO' : undefined}
          title={
            commons
              ? 'Donate'
              : demo
                ? `Donate to ${DEMO_BRAND.short}`
                : 'Donate to SHMS PTO'
          }
          body={
            commons
              ? 'Direct donations support programs and events. Checkout stays off until Square is connected.'
              : demo
                ? `Any amount helps ${DEMO_BRAND.short} fund enrichment, ${DEMO_BRAND.store}, and events for ${DEMO_BRAND.school} students.`
                : 'Any amount helps the PTO fund enrichment, The Cove, and events for Stone Hill students.'
          }
        />
        <CommunityBanner />
      </main>
      <Footer />
    </div>
  )
}
