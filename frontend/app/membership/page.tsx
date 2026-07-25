import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { MembershipTiers } from '@/components/membership/membership-tiers'
import { MembershipCheckoutHandler } from '@/components/membership/membership-checkout-handler'
import { PageHero } from '@/components/page-hero'
import { ArrowRight } from 'lucide-react'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getMembershipTiers } from '@/lib/api/membership'
import { getFAQItems } from '@/lib/api/faq'
import { getPageContent } from '@/lib/api/page-content'
import { MembershipPortalCallouts } from '@/components/membership/membership-portal-callouts'
import { BrandImageWash } from '@/components/brand/brand-image-wash'
import { EmphasizedCopy } from '@/components/emphasized-copy'
import { DonateBlock } from '@/components/donate/donate-block'

export const revalidate = 60

export default async function MembershipPage() {
  const [settings, allTiers, faqItems, page] = await Promise.all([
    getSiteSettings(),
    getMembershipTiers(),
    getFAQItems('membership'),
    getPageContent('membership'),
  ])

  const sharedBenefits = settings
    .get('membershipSharedBenefits', '')
    .split('\n')
    .map(b => b.trim())
    .filter(Boolean)

  const facultyTier = allTiers.find(t => t.tierId === 'faculty')
  const facultyPrice = facultyTier?.price ?? 15
  const facultyDescription = facultyTier?.description ?? 'Faculty and staff memberships are $15 for the school year. We appreciate everything SHMS PTO educators do for our students.'
  const presidentEmail = settings.get('presidentEmail', 'president@shmspto.org')
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero content={page} />

        {/* Tiers */}
        <section
          id="tiers"
          className="relative overflow-hidden py-16 md:py-24"
          style={{ backgroundColor: '#F5F0E8' }}
        >
          <BrandImageWash src="/home/community.jpg" side="right" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">
                {page.sectionTitle}
              </h2>
              <p className="text-[#5A6070] max-w-xl mx-auto">
                <EmphasizedCopy text={page.sectionBody} />
              </p>
            </div>
            <MembershipCheckoutHandler />
            <MembershipTiers />
          </div>
        </section>

        <MembershipPortalCallouts lines={sharedBenefits} />

        {/* Faculty membership */}
        <section className="py-14" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-[#E8E4DC] flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
                >
                  SHMS PTO Faculty & Staff
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Faculty Membership</h3>
                <p className="text-[#5A6070] text-sm">
                  {facultyDescription}
                </p>
              </div>
              <div className="text-center shrink-0">
                <div className="text-3xl font-bold text-[#085508] mb-1">${facultyPrice}</div>
                <div className="text-xs text-[#5A6070] mb-4">per school year</div>
                <a
                  href={`mailto:${presidentEmail}?subject=Faculty%20PTO%20Membership`}
                  className="inline-flex items-center gap-2 font-semibold text-white px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#085508' }}
                >
                  Email to Join
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <DonateBlock
          title="Not joining a paid tier? You can still donate"
          body="Reef, Lagoon, and Tide are optional. If paid membership isn’t for you right now, any gift still helps the PTO fund enrichment, The Cove, and events for Stone Hill students."
        />

        {/* FAQ */}
        <section className="py-16 bg-white border-t border-[#E8E4DC]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8 text-center">
              Common Questions
            </h2>
            <div className="space-y-6">
              {faqItems.map((item) => (
                <div key={item.id} className="border-b border-[#E8E4DC] pb-6 last:border-0">
                  <h3 className="font-bold text-[#1A1A1A] mb-2">{item.question}</h3>
                  <p className="text-[#5A6070] text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
