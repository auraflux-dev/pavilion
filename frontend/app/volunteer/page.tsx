import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { VolunteerForm } from '@/components/volunteer/volunteer-form'
import { PageHero } from '@/components/page-hero'
import { CheckCircle2 } from 'lucide-react'
import { getVolunteerOpportunities } from '@/lib/api/volunteers'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'

export const revalidate = 300

export default async function VolunteerPage() {
  const [opportunities, settings, page] = await Promise.all([
    getVolunteerOpportunities(),
    getSiteSettings(),
    getPageContent('volunteer'),
  ])

  const BENEFITS = settings
    .get('volunteerBenefits', '')
    .split('\n')
    .map(b => b.trim())
    .filter(Boolean)
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero content={page} />

        {/* Two-column: why volunteer + form */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

              {/* Left: benefits + opportunities */}
              <div>
                <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">
                  Why Volunteers Matter
                </h2>
                <ul className="space-y-3.5 mb-12" aria-label="Volunteer benefits">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-5 h-5 mt-0.5 shrink-0"
                        style={{ color: '#085508' }}
                        aria-hidden="true"
                      />
                      <span className="text-[#1A1A1A] text-sm sm:text-base">{b}</span>
                    </li>
                  ))}
                </ul>

                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
                  Ways to Get Involved
                </h2>
                <div className="space-y-4">
                  {opportunities.map((opp) => (
                    <div
                      key={opp._id}
                      className="rounded-xl p-4 border border-[#E8E4DC] flex gap-4"
                    >
                      <div
                        className="w-1 rounded-full shrink-0"
                        style={{ backgroundColor: '#085508' }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-[#1A1A1A] text-sm">{opp.title}</h3>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EEF6EE', color: '#5A6070' }}
                          >
                            {opp.commitment}
                          </span>
                        </div>
                        <p className="text-sm text-[#5A6070]">{opp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: form — dropdown options from VolunteerOpportunities CMS */}
              <div className="lg:sticky lg:top-8">
                <VolunteerForm
                  opportunities={opportunities.map((o) => o.title).filter(Boolean)}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
