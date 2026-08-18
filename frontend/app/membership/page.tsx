import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { MembershipTiers } from '@/components/membership/membership-tiers'
import { MembershipCheckoutHandler } from '@/components/membership/membership-checkout-handler'
import { PageHero } from '@/components/page-hero'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getMembershipTiers } from '@/lib/api/membership'
import { FacultyMembershipJoin } from '@/components/membership/faculty-membership-join'
import { getFAQItems } from '@/lib/api/faq'
import { getPageContent } from '@/lib/api/page-content'
import { MembershipPortalCallouts } from '@/components/membership/membership-portal-callouts'
import { BrandImageWash } from '@/components/brand/brand-image-wash'
import { EmphasizedCopy } from '@/components/emphasized-copy'
import { DonateBlock } from '@/components/donate/donate-block'
import { MembershipSectionNav } from '@/components/jump-nav/public-section-navs'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

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
  const facultyPrice = facultyTier?.price ?? 20
  const facultyDescription =
    facultyTier?.description ??
    vanillaizeIfDemo(
      'Faculty and staff memberships are $20 for the school year. We appreciate everything SHMS PTO educators do for our students.',
    )
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero content={page} />
        <MembershipSectionNav />
        <ParentVideoSection
          videoId="membership-tiers"
          id="membership-video"
          eyebrow="Watch"
          title="Membership tiers in about 3 minutes"
          body="Reef, Lagoon, and Tide explained before you choose a plan."
          background="#FFFFFF"
        />

        {/* Tiers */}
        <section
          id="tiers"
          className="relative overflow-hidden scroll-mt-28 py-16 md:py-24"
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
        <section id="faculty" className="scroll-mt-28 py-14" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-[#E8E4DC] flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-10">
              <div className="flex-1 min-w-0">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
                >
                  {vanillaizeIfDemo('SHMS PTO Faculty & Staff')}
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Faculty Membership</h3>
                <p className="text-[#5A6070] text-sm leading-relaxed max-w-xl">
                  {facultyDescription}
                </p>
              </div>
              <div className="w-full sm:w-64 shrink-0 text-left sm:border-l sm:border-[#E8E4DC] sm:pl-8">
                <div className="text-3xl font-bold text-[#085508] leading-none">${facultyPrice}</div>
                <div className="text-xs text-[#5A6070] mt-1 mb-4">per school year</div>
                <FacultyMembershipJoin price={facultyPrice} />
              </div>
            </div>
          </div>
        </section>

        <DonateBlock
          title="Not joining a paid tier? You can still donate"
          body={vanillaizeIfDemo(
            'Reef, Lagoon, and Tide are optional. If paid membership isn’t for you right now, any gift still helps the PTO fund enrichment, The Cove, and events for Stone Hill students.',
          )}
        />

        {/* FAQ */}
        <section id="faq" className="scroll-mt-28 py-16 bg-white border-t border-[#E8E4DC]">
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
