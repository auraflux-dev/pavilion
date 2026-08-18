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

export default async function HomePage() {
  const inSession = await isSchoolInSession()
  const demo = isDemoInstance()

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Hero />
        {demo ? null : <RunForCharityPromo />}
        <ParentVideoSection
          videoId="parent-tour"
          id="parent-tour"
          eyebrow="New this year"
          title="Take a 3-minute website tour"
          body={
            demo
              ? `See how families use the ${DEMO_BRAND.short} site for membership, the ${DEMO_BRAND.card}, and ${DEMO_BRAND.store}.`
              : 'See how families use shmspto.org for membership, The Cove Digital Card, and more.'
          }
          background="#FFFFFF"
        />
        <HomeSectionNav showPrograms={inSession} showEvents={inSession} />
        {inSession ? <ProgramsPreview /> : null}
        <VolunteerSection />
        {inSession ? <UpcomingEvents /> : null}
        <DonateBlock
          compact
          title={demo ? `Donate to ${DEMO_BRAND.short}` : 'Donate to SHMS PTO'}
          body={
            demo
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
