import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { ProgramsPreview } from '@/components/programs-preview'
import { VolunteerSection } from '@/components/volunteer-section'
import { UpcomingEvents } from '@/components/upcoming-events'
import { CommunityBanner } from '@/components/community-banner'
import { Footer } from '@/components/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProgramsPreview />
        <VolunteerSection />
        <UpcomingEvents />
        <CommunityBanner />
      </main>
      <Footer />
    </div>
  )
}
