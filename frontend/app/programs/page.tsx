import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProgramCard } from '@/components/programs/program-card'
import { ProgramsFilter } from '@/components/programs/programs-filter'
import { PageHero } from '@/components/page-hero'
import { ProgramsContactForm } from '@/components/programs/programs-contact-form'
import { getAllPrograms, type Program } from '@/lib/api/programs'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { normalizeStaffInbox, STAFF_INBOX_FALLBACK } from '@/lib/staff/inbox'
import { ProgramsSectionNav } from '@/components/jump-nav/public-section-navs'

export const revalidate = 300 // revalidate every 5 minutes

export default async function ProgramsPage() {
  let programs: Program[] = []
  let error = false

  const [settings, page] = await Promise.all([getSiteSettings(), getPageContent('programs')])
  const programsEmail = normalizeStaffInbox(
    settings.get('contactEmailPrograms', STAFF_INBOX_FALLBACK),
  )
  const inSession = settings.getBool('schoolInSession', false)

  try {
    programs = inSession ? await getAllPrograms() : []
  } catch {
    error = true
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero
          content={{
            ...page,
            ...(inSession
              ? {}
              : {
                  eyebrow: 'Off season',
                  title: vanillaizeIfDemo('Programs resume with the school year'),
                  body: vanillaizeIfDemo('Enrichment programs are paused while school is out of session. Check back in the fall, or visit The Cove and Membership anytime.'),
                  ctaLabel: vanillaizeIfDemo('Shop The Cove'),
                  ctaHref: '/cove',
                }),
          }}
        />
        <ProgramsSectionNav />

        {/* Programs grid */}
        <section
          id="programs-list"
          className="scroll-mt-28 py-16 md:py-24"
          style={{ backgroundColor: 'var(--brand-warm)' }}
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
              <ProgramsFilter programs={programs} />
            )}
          </div>
        </section>

        {/* Questions → VP of Programs */}
        <section
          id="programs-contact"
          className="scroll-mt-28 border-t border-[var(--border)] bg-white py-14 md:py-20"
          aria-labelledby="programs-contact-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2
                id="programs-contact-heading"
                className="mb-3 text-2xl font-bold text-[#1A1A1A] sm:text-3xl"
              >
                Questions about a program?
              </h2>
              <p className="mx-auto max-w-xl text-[#5A6070]">
                Message the VP of Programs. Co-VPs Fundraising &amp; Programs will follow up.
              </p>
            </div>
            <ProgramsContactForm toEmail={programsEmail} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
