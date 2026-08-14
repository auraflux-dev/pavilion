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

export default async function HomePage() {
  const inSession = await isSchoolInSession()

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Hero />
        <RunForCharityPromo />
        <ParentVideoSection
          videoId="parent-tour"
          id="parent-tour"
          eyebrow="New this year"
          title="Take a 3-minute website tour"
          body="See how families use shmspto.org for membership, The Cove Digital Card, and more."
          background="#FFFFFF"
        />
        <HomeSectionNav showPrograms={inSession} showEvents={inSession} />
        {inSession ? <ProgramsPreview /> : null}
        <VolunteerSection />
        {inSession ? <UpcomingEvents /> : null}
        <DonateBlock
          compact
          title="Donate to SHMS PTO"
          body="Any amount helps the PTO fund enrichment, The Cove, and events for Stone Hill students."
        />
        <CommunityBanner />
      </main>
      <Footer />
    </div>
  )
}
