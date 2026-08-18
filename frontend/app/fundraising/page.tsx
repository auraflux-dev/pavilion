import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getFundraisingTotals } from '@/lib/api/fundraising'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getFundraisingCTAs } from '@/lib/api/fundraising-ctas'
import { getPageContent } from '@/lib/api/page-content'
import { DepartmentContactForm } from '@/components/programs/programs-contact-form'
import { PortalBusinessOwnerForm } from '@/components/member-portal/portal-business-owner-form'
import { getActiveSponsors } from '@/lib/api/sponsors'
import { normalizeStaffInbox } from '@/lib/staff/inbox'
import { ArrowRight, Heart, TrendingUp, Users, ShoppingBag, Ticket, Star, RefreshCw, Handshake, type LucideIcon } from 'lucide-react'
import { DonateBlock } from '@/components/donate/donate-block'
import { FundraisingSectionNav } from '@/components/jump-nav/public-section-navs'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

const ICON_MAP: Record<string, LucideIcon> = {
  Star, ShoppingBag, Users, Heart, TrendingUp, Ticket, ArrowRight, RefreshCw,
}

export const revalidate = 3600 // refresh totals every hour

export async function generateMetadata() {
  return {
    title: vanillaizeIfDemo('Fundraising | SHMS PTO'),
    description: vanillaizeIfDemo(
      'Every purchase, membership, and Cove sale directly funds SHMS PTO student enrichment. Track live goals here.',
    ),
  }
}

function pct(raised: number, goal: number) {
  return Math.min(100, Math.round((raised / goal) * 100))
}

function fmtDollars(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

export default async function FundraisingPage() {
  const [data, settings, ctas, page, sponsors] = await Promise.all([
    getFundraisingTotals(),
    getSiteSettings(),
    getFundraisingCTAs(),
    getPageContent('fundraising'),
    getActiveSponsors(),
  ])
  const { totals, goals, volunteerHoursRaised, volunteerHoursGoal } = data
  const sponsorshipRaised = settings.getNumber('sponsorshipRaised', 0)
  const sponsorshipGoal = settings.getNumber('goalSponsorship', 5000)
  const sponsorshipEmail = normalizeStaffInbox(
    settings.get('contactEmailSponsorship', 'vp-initiatives@shmspto.org'),
  )

  const ANNUAL_GOAL = settings.getNumber('fundraisingAnnualGoal', 21667)

  const ALLOCATIONS = [
    { label: 'Student Enrichment Programs', pct: settings.getNumber('allocStudentEnrichment', 45), amount: '' },
    { label: 'School Events & Celebrations', pct: settings.getNumber('allocSchoolEvents', 25),    amount: '' },
    { label: 'Teacher & Classroom Support',  pct: settings.getNumber('allocTeacherSupport', 15),  amount: '' },
    { label: vanillaizeIfDemo('The Cove Operations'),          pct: settings.getNumber('allocStoreOps', 10),         amount: '' },
    { label: 'PTO Admin & Communications',   pct: settings.getNumber('allocPTOAdmin', 5),          amount: '' },
  ].map(a => ({ ...a, amount: fmtDollars(ANNUAL_GOAL * a.pct / 100) }))

  const totalRaised =
    totals.membership +
    totals.store +
    totals.spiritWear +
    totals.danceNight +
    totals.novaMath +
    totals.other +
    sponsorshipRaised
  const overallPct  = pct(totalRaised, ANNUAL_GOAL)

  const initiatives = [
    {
      id: 'membership',
      icon: Star,
      label: 'Memberships',
      description: vanillaizeIfDemo('Annual PTO memberships (Reef, Lagoon, Tide) are our largest revenue source, funding enrichment programs directly.'),
      raised: totals.membership,
      goal:   goals.membership,
      href: '/membership',
      cta: 'Join Now',
    },
    {
      id: 'store',
      icon: ShoppingBag,
      label: vanillaizeIfDemo('The Cove Digital Card'),
      description: vanillaizeIfDemo('Student snack window sales via prepaid Cove Digital Cards at The Cove.'),
      raised: totals.store,
      goal:   goals.store,
      href: '/cove',
      cta: vanillaizeIfDemo('Load Cove Digital Card'),
    },
    {
      id: 'spiritWear',
      icon: Heart,
      label: vanillaizeIfDemo('The Cove shop'),
      description: vanillaizeIfDemo('Year-round Stingrays apparel and merchandise from The Cove.'),
      raised: totals.spiritWear,
      goal:   goals.spiritWear,
      href: '/cove#shop',
      cta: vanillaizeIfDemo('Shop The Cove'),
    },
    {
      id: 'danceNight',
      icon: Ticket,
      label: 'Dance Night',
      description: 'Ticket sales and concessions from our annual end-of-year student dance celebration.',
      raised: totals.danceNight,
      goal:   goals.danceNight,
      href: '/events',
      cta: 'View Events',
    },
    {
      id: 'novaMath',
      icon: TrendingUp,
      label: vanillaizeIfDemo('NOVA Math Tournament'),
      description: vanillaizeIfDemo(
        'Registration fees and community support for our students competing in the Northern Virginia Math Tournament.',
      ),
      raised: totals.novaMath,
      goal:   goals.novaMath,
      href: '/programs',
      cta: 'View Programs',
    },
    {
      id: 'sponsorship',
      icon: Handshake,
      label: 'Sponsorships',
      description: 'Local businesses and community partners who fund events, programs, and student enrichment.',
      raised: sponsorshipRaised,
      goal: sponsorshipGoal,
      href: '/fundraising#sponsorship',
      cta: 'Become a Sponsor',
    },
    {
      id: 'volunteer',
      icon: Users,
      label: 'Volunteer Hours',
      description: 'We track volunteer hours as a community impact metric. Every hour has a real dollar value to our school.',
      raised: volunteerHoursRaised,
      goal:   volunteerHoursGoal,
      href: '/volunteer',
      cta: 'Volunteer',
      unit: 'hrs' as const,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" className="flex-1">

        {/* Hero. overall progress */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#085508' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFD700' }}
            >
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              {page.eyebrow}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {page.title}
            </h1>
            <p className="text-white/75 text-lg max-w-xl mx-auto mb-10">
              {page.body}
            </p>

            {/* Overall progress card */}
            <div
              className="inline-block rounded-2xl px-8 py-6 text-left w-full max-w-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex items-end gap-6 mb-4">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Total Raised</p>
                  <p className="text-4xl font-bold text-white">{fmtDollars(totalRaised)}</p>
                </div>
                <div className="pb-1 text-white/40 text-lg">of</div>
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Annual Goal</p>
                  <p className="text-4xl font-bold" style={{ color: '#FFD700' }}>{fmtDollars(ANNUAL_GOAL)}</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${overallPct}%`, backgroundColor: '#FFD700' }}
                  role="progressbar"
                  aria-valuenow={overallPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium">{overallPct}% of annual goal</p>
                <p className="text-white/40 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  Updates hourly
                </p>
              </div>
            </div>
          </div>
        </section>

        <FundraisingSectionNav />

        <DonateBlock
          title={vanillaizeIfDemo('Make a gift to SHMS PTO')}
          body={vanillaizeIfDemo(
            'Choose any amount. Your gift goes to the PTO: enrichment, The Cove, teacher support, and events for Stone Hill students. Not a donation to the school district.',
          )}
        />

        {/* Initiative cards */}
        <section id="initiatives" className="scroll-mt-28 py-14 md:py-20" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: '#085508', color: 'white' }}
              >
                By Initiative
              </div>
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                Every Way You Can Help
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-xl mx-auto">
                {vanillaizeIfDemo(
                  'Memberships, Cove Digital Cards, event tickets, and volunteering. It all adds up.',
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initiatives.map((initiative) => {
                const Icon = initiative.icon
                const isHrs = initiative.unit === 'hrs'
                const raisedDisplay = isHrs
                  ? `${initiative.raised} hrs`
                  : fmtDollars(initiative.raised)

                return (
                  <article
                    key={initiative.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DC] flex flex-col hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#EEF6EE' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#085508' }} aria-hidden="true" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{initiative.label}</h3>
                    <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                      {initiative.description}
                    </p>

                    {/* Raised only. per-area goals stay in Staff settings (not public) */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold" style={{ color: '#085508' }}>
                        {raisedDisplay}
                        <span className="text-[#5A6070] font-normal"> raised</span>
                      </p>
                    </div>

                    {isHrs && (
                      <p className="text-xs text-[#5A6070] mb-3 italic">
                        Hours are updated manually by the PTO board each month.
                      </p>
                    )}

                    <a
                      href={initiative.href}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#085508' }}
                    >
                      {initiative.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Where funds go */}
        <section id="allocations" className="scroll-mt-28 py-14 md:py-20 bg-white border-t border-[#E8E4DC]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
              >
                Transparency
              </div>
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                Where the Funds Go
              </h2>
              <p className="text-[#5A6070] mt-3">
                {vanillaizeIfDemo(
                  '100% of gifts support SHMS PTO programs for Stone Hill students, not the school district.',
                )}
              </p>
            </div>

            <div className="space-y-5">
              {ALLOCATIONS.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                    <span style={{ color: '#085508' }}>
                      {item.amount}{' '}
                      <span className="text-[#5A6070] font-normal">({item.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#E8E4DC] rounded-full h-3">
                    <div
                      className="h-3 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: '#085508' }}
                      role="progressbar"
                      aria-valuenow={item.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.label}: ${item.pct}%`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-[#5A6070] mt-8">
              Based on the current annual goal of {fmtDollars(ANNUAL_GOAL)}. Totals refresh hourly from paid orders.
            </p>
          </div>
        </section>

        {/* Sponsorships. deep link: /fundraising#sponsorship */}
        <section
          id="sponsorship"
          className="scroll-mt-28 py-14 md:py-20 border-t border-[#E8E4DC] bg-white"
          aria-labelledby="sponsorship-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
              >
                Community Partners
              </div>
              <h2 id="sponsorship-heading" className="text-3xl font-bold text-[#1A1A1A]">
                Sponsorships
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-2xl mx-auto">
                {vanillaizeIfDemo(
                  'Highlighting businesses and organizations who support Stone Hill students. Suggest a sponsor or apply on behalf of your business (VP of Initiatives). Family-owned businesses can introduce themselves below so Membership Experience can connect with you.',
                )}
              </p>
            </div>

            {sponsors.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12" role="list">
                {sponsors.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-[#E8E4DC] bg-[#FAFCF9] p-5 flex flex-col"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#085508] mb-2">
                      {s.tier}
                    </p>
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{s.name}</h3>
                    {s.blurb ? (
                      <p className="text-sm text-[#5A6070] mt-2 flex-1">{s.blurb}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    {s.websiteUrl ? (
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-sm font-semibold inline-flex items-center gap-1"
                        style={{ color: '#085508' }}
                      >
                        Visit site
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-[#5A6070] mb-10">
                {vanillaizeIfDemo(
                  'Future sponsors will appear here. Be the first to partner with SHMS PTO.',
                )}
              </p>
            )}

            <DepartmentContactForm toEmail={sponsorshipEmail} variant="sponsorship" />

            <div className="mt-12 max-w-xl mx-auto">
              <PortalBusinessOwnerForm mode="public" />
            </div>
          </div>
        </section>

        {/* How to contribute */}
        <section id="contribute" className="scroll-mt-28 py-16" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                How Can You Contribute?
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-xl mx-auto">
                Every action counts. Pick what works best for your family.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ctas.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? Star
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className="bg-white rounded-2xl p-6 border border-[#E8E4DC] flex flex-col hover:shadow-md transition-shadow duration-300 group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: '#EEF6EE' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#085508' }} aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#5A6070] leading-relaxed flex-1 mb-4">{item.description}</p>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all"
                      style={{ color: '#085508' }}
                    >
                      {item.ctaLabel}
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
