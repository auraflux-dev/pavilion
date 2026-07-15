import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { MembershipTiers } from '@/components/membership/membership-tiers'
import { MembershipCheckoutHandler } from '@/components/membership/membership-checkout-handler'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getMembershipTiers } from '@/lib/api/membership'
import { getFAQItems } from '@/lib/api/faq'

export const revalidate = 300

export default async function MembershipPage() {
  const [settings, allTiers, faqItems] = await Promise.all([
    getSiteSettings(),
    getMembershipTiers(),
    getFAQItems('membership'),
  ])

  const sharedBenefits = settings
    .get('membershipSharedBenefits', '')
    .split('\n')
    .map(b => b.trim())
    .filter(Boolean)

  const facultyTier = allTiers.find(t => t.tierId === 'faculty')
  const facultyPrice = facultyTier?.price ?? 15
  const facultyDescription = facultyTier?.description ?? 'Faculty and staff memberships are $15 for the school year. We appreciate everything SHMS educators do for our students.'
  const presidentEmail = settings.get('presidentEmail', 'president@shmspto.org')
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        {/* Hero */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#085508' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              Join the PTO
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              PTO Membership
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Your membership directly funds enrichment programs, events, and resources
              that benefit every student at Stone Hill Middle School.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <section id="tiers" className="py-16 md:py-24" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">
                Choose Your Membership
              </h2>
              <p className="text-[#5A6070] max-w-xl mx-auto">
                Start with a free parent account (log in / sign up), then purchase Ruby or
                Supreme for the 2025–26 school year. Paid tiers include voting rights and
                member perks in your portal.
              </p>
            </div>
            <MembershipCheckoutHandler />
            <MembershipTiers />
          </div>
        </section>

        {/* All benefits */}
        <section className="py-16 bg-white border-t border-[#E8E4DC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8 text-center">
              All Members Receive
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sharedBenefits.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={{ color: '#085508' }}
                    aria-hidden="true"
                  />
                  <span className="text-[#1A1A1A] text-sm sm:text-base">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Faculty membership */}
        <section className="py-14" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-[#E8E4DC] flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
                >
                  SHMS Faculty & Staff
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
