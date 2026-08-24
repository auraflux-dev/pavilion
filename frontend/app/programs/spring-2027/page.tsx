import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Spring2027EpSchedule } from '@/components/programs/spring-2027-ep-schedule'
import { spring2027PacketScheduleRows, spring2027WeatherMakeupFootnote } from '@/lib/programs/spring-2027-ep'
import { getPageContent } from '@/lib/api/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spring 2027 Enrichment Schedule | SHMS PTO',
  description: 'Spring 2027 enrichment at Stone Hill. Share with instructors.',
}

export default async function Spring2027EpSchedulePage() {
  const rows = spring2027PacketScheduleRows()
  const theme = await getPageContent('programs')

  return (
    <PageThemeRoot pageKey="programs" className="min-h-screen flex flex-col">
      <PageThemeStyles pageKey="programs" css={theme.customCss ?? ''} />
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Spring2027EpSchedule rows={rows} footnote={spring2027WeatherMakeupFootnote()} />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </PageThemeRoot>
  )
}
