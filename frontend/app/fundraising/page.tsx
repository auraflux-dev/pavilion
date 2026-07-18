import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getFundraisingTotals } from '@/lib/api/fundraising'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getFundraisingCTAs } from '@/lib/api/fundraising-ctas'
import { getPageContent } from '@/lib/api/page-content'
import { ArrowRight, Heart, TrendingUp, Users, ShoppingBag, Ticket, Star, RefreshCw, type LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Star, ShoppingBag, Users, Heart, TrendingUp, Ticket, ArrowRight, RefreshCw,
}

export const revalidate = 3600 // refresh totals every hour

export const metadata = {
  title: 'Fundraising | SHMS PTO',
  description: 'Every purchase, membership, and Cove sale directly funds SHMS student enrichment. Track live goals here.',
}

function pct(raised: number, goal: number) {
  return Math.min(100, Math.round((raised / goal) * 100))
}

function fmtDollars(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

export default async function FundraisingPage() {
  const [data, settings, ctas, page] = await Promise.all([
    getFundraisingTotals(),
    getSiteSettings(),
    getFundraisingCTAs(),
    getPageContent('fundraising'),
  ])
  const { totals, goals, volunteerHoursRaised, volunteerHoursGoal } = data

  const ANNUAL_GOAL = settings.getNumber('fundraisingAnnualGoal', 21667)

  const ALLOCATIONS = [
    { label: 'Student Enrichment Programs', pct: settings.getNumber('allocStudentEnrichment', 45), amount: '' },
    { label: 'School Events & Celebrations', pct: settings.getNumber('allocSchoolEvents', 25),    amount: '' },
    { label: 'Teacher & Classroom Support',  pct: settings.getNumber('allocTeacherSupport', 15),  amount: '' },
    { label: 'The Cove Operations',          pct: settings.getNumber('allocStoreOps', 10),         amount: '' },
    { label: 'PTO Admin & Communications',   pct: settings.getNumber('allocPTOAdmin', 5),          amount: '' },
  ].map(a => ({ ...a, amount: fmtDollars(ANNUAL_GOAL * a.pct / 100) }))

  const totalRaised = totals.membership + totals.store + totals.spiritWear +
                      totals.danceNight + totals.novaMath + totals.other
  const overallPct  = pct(totalRaised, ANNUAL_GOAL)

  const initiatives = [
    {
      id: 'membership',
      icon: Star,
      label: 'Memberships',
      description: 'Annual PTO memberships (Reef, Lagoon, Tide) are our largest revenue source, funding enrichment programs directly.',
      raised: totals.membership,
      goal:   goals.membership,
      href: '/membership',
      cta: 'Join Now',
    },
    {
      id: 'store',
      icon: ShoppingBag,
      label: 'The Cove — store card',
      description: 'Student snack-window sales via prepaid store cards at The Cove.',
      raised: totals.store,
      goal:   goals.store,
      href: '/cove',
      cta: 'Load a Card',
    },
    {
      id: 'spiritWear',
      icon: Heart,
      label: 'The Cove — shop',
      description: 'Year-round Stingrays apparel and merchandise from The Cove.',
      raised: totals.spiritWear,
      goal:   goals.spiritWear,
      href: '/cove#shop',
      cta: 'Shop The Cove',
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
      label: 'NOVA Math Tournament',
      description: 'Registration fees and sponsorships for our students competing in the Northern Virginia Math Tournament.',
      raised: totals.novaMath,
      goal:   goals.novaMath,
      href: '/programs',
      cta: 'View Programs',
    },
    {
      id: 'volunteer',
      icon: Users,
      label: 'Volunteer Hours',
      description: 'We track volunteer hours as a community impact metric — every hour has a real dollar value to our school.',
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

        {/* Hero — overall progress */}
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

        {/* Initiative cards */}
        <section className="py-14 md:py-20" style={{ backgroundColor: '#F5F0E8' }}>
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
                Memberships, store cards, event tickets, and volunteering — it all adds up.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initiatives.map((initiative) => {
                const p    = pct(initiative.raised, initiative.goal)
                const Icon = initiative.icon
                const isHrs = initiative.unit === 'hrs'
                const raisedDisplay = isHrs
                  ? `${initiative.raised} hrs`
                  : fmtDollars(initiative.raised)
                const goalDisplay = isHrs
                  ? `${initiative.goal} hrs`
                  : fmtDollars(initiative.goal)

                return (
                  <article
                    key={initiative.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DC] flex flex-col hover:shadow-md transition-shadow duration-300"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#EEF6EE' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#085508' }} aria-hidden="true" />
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: p >= 100 ? '#085508' : '#EEF6EE',
                          color: p >= 100 ? 'white' : '#085508',
                        }}
                      >
                        {p >= 100 ? '🎉 Goal Met!' : `${p}%`}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{initiative.label}</h3>
                    <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                      {initiative.description}
                    </p>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span style={{ color: '#085508' }}>
                          {raisedDisplay}
                          <span className="text-[#5A6070] font-normal"> raised</span>
                        </span>
                        <span className="text-[#5A6070]">Goal: {goalDisplay}</span>
                      </div>
                      <div className="w-full bg-[#E8E4DC] rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${p}%`,
                            backgroundColor: p >= 100 ? '#FFD700' : '#085508',
                          }}
                          role="progressbar"
                          aria-valuenow={p}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${initiative.label}: ${p}% of goal`}
                        />
                      </div>
                    </div>

                    {/* Manual update note for volunteer hours */}
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
        <section className="py-14 md:py-20 bg-white border-t border-[#E8E4DC]">
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
                100% of PTO funds stay at Stone Hill Middle School.
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

        {/* How to contribute */}
        <section className="py-16" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                How Can You Contribute?
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-xl mx-auto">
                Every action counts — pick what works best for your family.
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
