import { VisitorChrome } from '@/components/site/visitor-chrome'
import { MembershipTiers } from '@/components/membership/membership-tiers'
import { MembershipCheckoutHandler } from '@/components/membership/membership-checkout-handler'
import { PageHero } from '@/components/page-hero'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getMembershipTiers } from '@/lib/api/membership'
import { FacultyMembershipJoin } from '@/components/membership/faculty-membership-join'
import { getFAQItems } from '@/lib/api/faq'
import { getPageContent } from '@/lib/api/page-content'
import { getVisitorVideoStrings, visitorString } from '@/lib/api/visitor-strings'
import { VISITOR_VIDEO_DEFAULTS } from '@/lib/defaults/visitor-string-defaults'
import { MembershipPortalCallouts } from '@/components/membership/membership-portal-callouts'
import { BrandImageWash } from '@/components/brand/brand-image-wash'
import { EmphasizedCopy } from '@/components/emphasized-copy'
import { DonateBlock } from '@/components/donate/donate-block'
import { MembershipSectionNav } from '@/components/jump-nav/public-section-navs'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isCommonsPlatform } from '@/lib/crm/active-trial'

export const revalidate = 60

export default async function MembershipPage() {
  const commons = isCommonsPlatform()
  const [settings, allTiers, faqItems, page, videoStrings] = await Promise.all([
    getSiteSettings(),
    getMembershipTiers(),
    getFAQItems('membership'),
    getPageContent('membership'),
    getVisitorVideoStrings(),
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
    <VisitorChrome pageKey="membership">
        <PageHero content={page} />
        <MembershipSectionNav />
        {commons ? null : (
          <ParentVideoSection
            videoId="membership-tiers"
            id="membership-video"
            eyebrow={visitorString(videoStrings, 'video.membership.eyebrow', VISITOR_VIDEO_DEFAULTS['video.membership.eyebrow'])}
            title={visitorString(videoStrings, 'video.membership.title', VISITOR_VIDEO_DEFAULTS['video.membership.title'])}
            body={visitorString(videoStrings, 'video.membership.body', VISITOR_VIDEO_DEFAULTS['video.membership.body'])}
            background="#FFFFFF"
          />
        )}

        {/* Tiers */}
        <section
          id="tiers"
          className="relative overflow-hidden scroll-mt-28 py-16 md:py-24"
          style={{ backgroundColor: 'var(--brand-warm)' }}
        >
          <BrandImageWash
            src={settings.get('homeCommunityImageUrl', '/home/community.jpg')}
            side="right"
          />
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

        {/* Faculty membership. Stone Hill only */}
        {commons ? null : <section id="faculty" className="scroll-mt-28 py-14" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-[var(--border)] flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-10">
              <div className="flex-1 min-w-0">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
                >
                  {vanillaizeIfDemo('SHMS PTO Faculty & Staff')}
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Faculty Membership</h3>
                <p className="text-[#5A6070] text-sm leading-relaxed max-w-xl">
                  {facultyDescription}
                </p>
              </div>
              <div className="w-full sm:w-64 shrink-0 text-left sm:border-l sm:border-[var(--border)] sm:pl-8">
                <div className="text-3xl font-bold text-[var(--brand-green)] leading-none">${facultyPrice}</div>
                <div className="text-xs text-[#5A6070] mt-1 mb-4">per school year</div>
                <FacultyMembershipJoin price={facultyPrice} />
              </div>
            </div>
          </div>
        </section>}

        <DonateBlock
          title={commons ? 'Prefer to give directly?' : 'Not joining a paid tier? You can still donate'}
          body={
            commons
              ? 'Membership is $25 for the year. Direct gifts also help programs and events.'
              : vanillaizeIfDemo(
                  'Reef, Lagoon, and Tide are optional. If paid membership isn’t for you right now, any gift still helps the PTO fund enrichment, The Cove, and events for Stone Hill students.',
                )
          }
        />

        {/* FAQ */}
        <section id="faq" className="scroll-mt-28 py-16 bg-white border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8 text-center">
              Common Questions
            </h2>
            <div className="space-y-6">
              {faqItems.map((item) => (
                <div key={item.id} className="border-b border-[var(--border)] pb-6 last:border-0">
                  <h3 className="font-bold text-[#1A1A1A] mb-2">{item.question}</h3>
                  <p className="text-[#5A6070] text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
    </VisitorChrome>
  )
}
