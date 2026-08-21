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
import {
  DEFAULT_PROGRAMS_INBOXES,
  parseStaffInboxes,
} from '@/lib/staff/inbox'
import { ProgramsSectionNav } from '@/components/jump-nav/public-section-navs'
import { BrandImageWash } from '@/components/brand/brand-image-wash'

export const revalidate = 300 // revalidate every 5 minutes

export default async function ProgramsPage() {
  let programs: Program[] = []
  let error = false

  const [settings, page] = await Promise.all([getSiteSettings(), getPageContent('programs')])
  const programsEmail =
    parseStaffInboxes(
      settings.get('contactEmailPrograms', DEFAULT_PROGRAMS_INBOXES),
    ).join(', ') || DEFAULT_PROGRAMS_INBOXES
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
        {(() => {
          const bodyLines = String(page.body ?? '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
          const bulletLines = (page.bullets ?? [])
            .map((b) => String(b).trim())
            .filter(Boolean)
          let heroBody = inSession
            ? bodyLines[0] || 'After-school classes for grades 6 to 8.'
            : vanillaizeIfDemo(
                'Enrichment programs are paused while school is out of session. Check back in the fall, or visit The Cove and Membership anytime.',
              )
          let detailBeats = inSession ? [...bodyLines.slice(1), ...bulletLines] : []
          // Long CMS hero blobs become scannable beats, not a centered wall of text.
          if (inSession && heroBody.length > 90) {
            detailBeats = [...bodyLines, ...bulletLines]
            heroBody = 'After-school classes for grades 6 to 8.'
          }
          return (
            <>
              <PageHero
                content={{
                  ...page,
                  body: heroBody,
                  ...(inSession
                    ? {}
                    : {
                        eyebrow: 'Off season',
                        title: vanillaizeIfDemo('Programs resume with the school year'),
                        ctaLabel: vanillaizeIfDemo('Shop The Cove'),
                        ctaHref: '/cove',
                      }),
                }}
              />
              {inSession && detailBeats.length > 0 ? (
                <section
                  className="border-b border-[var(--border)] bg-white py-10 md:py-12"
                  aria-label="Program overview"
                >
                  <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <ul className="space-y-3 text-left text-base text-[#5A6070] leading-snug">
                      {detailBeats.map((beat) => (
                        <li key={beat} className="flex gap-3">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: 'var(--brand-green)' }}
                            aria-hidden
                          />
                          <span className="whitespace-pre-line">{beat}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={page.ctaHref?.startsWith('#') ? page.ctaHref : '#programs-list'}
                      className="mt-8 inline-block text-sm font-semibold underline underline-offset-2"
                      style={{ color: 'var(--brand-green)' }}
                    >
                      {page.ctaLabel?.trim() || 'Browse classes'}
                    </a>
                  </div>
                </section>
              ) : null}
            </>
          )
        })()}
        <ProgramsSectionNav />

        {/* Programs grid */}
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
                <ProgramsFilter programs={programs} />
              </>
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
            <DepartmentContactForm toEmail={programsEmail} variant="programs" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
