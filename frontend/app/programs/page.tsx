import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProgramCard } from '@/components/programs/program-card'
import { ProgramsFilter } from '@/components/programs/programs-filter'
import { PageHero } from '@/components/page-hero'
import { getAllPrograms, type Program } from '@/lib/api/programs'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { ArrowRight } from 'lucide-react'

export const revalidate = 300 // revalidate every 5 minutes

export default async function ProgramsPage() {
  let programs: Program[] = []
  let error = false

  const [settings, page] = await Promise.all([getSiteSettings(), getPageContent('programs')])
  const presidentEmail = settings.get('presidentEmail', 'president@shmspto.org')

  try {
    programs = await getAllPrograms()
  } catch {
    error = true
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero content={page} />

        {/* Programs grid */}
        <section
          className="py-16 md:py-24"
          style={{ backgroundColor: '#F5F0E8' }}
          aria-labelledby="programs-list-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="programs-list-heading" className="sr-only">
              All Programs
            </h2>

            {error && (
              <div className="text-center py-16">
                <p className="text-[#5A6070] text-lg">
                  Unable to load programs right now. Please try again later.
                </p>
              </div>
            )}

            {!error && programs.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#5A6070] text-lg">
                  No programs are currently listed. Check back soon!
                </p>
              </div>
            )}

            {!error && programs.length > 0 && (
              <>
                <ProgramsFilter programs={programs} />
              </>
            )}
          </div>
        </section>

        {/* Questions CTA */}
        <section className="py-14 bg-white border-t border-[#E8E4DC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              Questions about a program?
            </h2>
            <p className="text-[#5A6070] mb-6 max-w-xl mx-auto">
              Reach out to the PTO board and we&apos;ll get back to you quickly.
            </p>
            <a
              href={`mailto:${presidentEmail}`}
              className="inline-flex items-center gap-2 font-semibold text-white px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#085508' }}
            >
              Contact Us
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
