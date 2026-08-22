import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProgramsFilter } from '@/components/programs/programs-filter'
import { PageHero } from '@/components/page-hero'
import { DepartmentContactForm } from '@/components/programs/programs-contact-form'
import { getAllPrograms, type Program } from '@/lib/api/programs'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import {
  DEFAULT_PROGRAMS_INBOXES,
  parseStaffInboxes,
} from '@/lib/staff/inbox'
import { ProgramsSectionNav } from '@/components/jump-nav/public-section-navs'
import { BrandImageWash } from '@/components/brand/brand-image-wash'
import { canViewProgramsCatalogNow, isProgramsReviewHost } from '@/lib/programs/public-access'
import { ProgramsPreviewBanner } from '@/components/programs/programs-preview-banner'

export const revalidate = 300 // revalidate every 5 minutes

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  let programs: Program[] = []
  let error = false

  const sp = searchParams ? await searchParams : {}
  const previewToken = typeof sp.programsPreview === 'string' ? sp.programsPreview : null
  const access = await canViewProgramsCatalogNow({ previewToken })
  const reviewHost = await isProgramsReviewHost()

  const [settings, page] = await Promise.all([getSiteSettings(), getPageContent('programs')])
  const programsEmail =
    parseStaffInboxes(
      settings.get('contactEmailPrograms', DEFAULT_PROGRAMS_INBOXES),
    ).join(', ') || DEFAULT_PROGRAMS_INBOXES
  const inSession = settings.getBool('schoolInSession', false)
  const catalogOpen = inSession && access.allowed

  try {
    programs = catalogOpen ? await getAllPrograms() : []
  } catch {
    error = true
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      {access.previewMode ? <ProgramsPreviewBanner /> : null}

      <main id="main-content">
        <PageHero
          content={{
            ...page,
            // Keep hero short. Class names live on the cards below, not in a duplicate list.
            body: catalogOpen
              ? isDemoInstance()
                ? 'After-school clubs and classes for elementary grades.'
                : 'After-school classes for grades 6 to 8.'
              : inSession
                ? 'Check back here once you receive the announcement that registration is open.'
                : vanillaizeIfDemo(
                    'Enrichment programs are paused while school is out of session. Check back in the fall, or visit The Cove and Membership anytime.',
                  ),
            ...(catalogOpen
              ? {}
              : inSession
                ? {
                    eyebrow: 'Coming soon',
                    title: 'Enrichment programs',
                    ctaLabel: 'Shop The Cove',
                    ctaHref: '/cove',
                  }
                : {
                    eyebrow: 'Off season',
                    title: vanillaizeIfDemo('Programs resume with the school year'),
                    ctaLabel: vanillaizeIfDemo('Shop The Cove'),
                    ctaHref: '/cove',
                  }),
          }}
        />
        {catalogOpen ? <ProgramsSectionNav springCatalogVisible={reviewHost} /> : null}

        {catalogOpen ? (
          <section
            id="programs-list"
            className="scroll-mt-28 relative overflow-hidden py-16 md:py-24"
            style={{ backgroundColor: 'var(--brand-warm)' }}
            aria-labelledby="programs-list-heading"
          >
            <BrandImageWash src="/home/hero-a.jpg" side="left" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 id="programs-list-heading" className="sr-only">
                Enrichment by season
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
                  {(page.sectionTitle || page.sectionBody) && (
                    <p className="mb-8 text-center text-sm text-[#5A6070] whitespace-pre-line">
                      {page.sectionTitle ? (
                        <a
                          href="/programs/fall-2026"
                          className="font-semibold underline"
                          style={{ color: 'var(--brand-green)' }}
                        >
                          {page.sectionTitle}
                        </a>
                      ) : null}
                      {page.sectionBody ? `\n${page.sectionBody}` : ''}
                    </p>
                  )}
                  <ProgramsFilter programs={programs} springCatalogVisible={reviewHost} />
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* Questions → Co-VP Fundraising & Programs */}
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
              <p className="mx-auto max-w-xl text-[#5A6070] whitespace-pre-line">
                {`Message Co-VP Fundraising & Programs.
The president is copied so your note is not sitting in one inbox alone.`}
              </p>
            </div>
            <DepartmentContactForm toEmail={programsEmail} variant="programs" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
