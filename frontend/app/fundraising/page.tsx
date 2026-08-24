import { getFundAllocationActuals } from '@/lib/api/fund-allocation'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { getFundraisingAnnualGoal, getFundraisingTotals } from '@/lib/api/fundraising'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getFundraisingCTAs } from '@/lib/api/fundraising-ctas'
import { getPageContent } from '@/lib/api/page-content'
import { getFundraisingPageCopy } from '@/lib/api/visitor-forms-copy'
import { formString } from '@/lib/copy/form-string'
import { DepartmentContactForm } from '@/components/programs/programs-contact-form'
import { ProgramUiCopyBoundary } from '@/components/programs/program-ui-copy-boundary'
import { PortalBusinessOwnerForm } from '@/components/member-portal/portal-business-owner-form'
import { getActiveSponsors } from '@/lib/api/sponsors'
import { DEFAULT_SPONSORSHIP_INBOXES, parseStaffInboxes } from '@/lib/staff/inbox'
import { ArrowRight, Heart, TrendingUp, Users, ShoppingBag, Ticket, Star, RefreshCw, Handshake, type LucideIcon } from 'lucide-react'
import { DonateBlock } from '@/components/donate/donate-block'
import { SponsorshipPackages } from '@/components/fundraising/sponsorship-packages'
import { FundraisingSectionNav } from '@/components/jump-nav/public-section-navs'
import { rollForwardSchoolYearCopy } from '@/lib/copy/roll-forward-school-year'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { MEMBERSHIP_CHOOSE_PATH } from '@/lib/membership-links'

const ICON_MAP: Record<string, LucideIcon> = {
  Star, ShoppingBag, Users, Heart, TrendingUp, Ticket, ArrowRight, RefreshCw,
}

function normalizeFundraisingEyebrow(raw: string) {
  const text = rollForwardSchoolYearCopy(String(raw ?? '').trim())
  return text || '2026-27 School Year · Live'
}

export const revalidate = 60

export async function generateMetadata() {
  return {
    title: 'Fundraising',
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
  const [data, settings, ctas, page, sponsors, allocations, annualGoal, shellCopy] = await Promise.all([
    getFundraisingTotals(),
    getSiteSettings(),
    getFundraisingCTAs(),
    getPageContent('fundraising'),
    getActiveSponsors(),
    getFundAllocationActuals(),
    getFundraisingAnnualGoal(),
    getFundraisingPageCopy(),
  ])
  const fs = (key: string, vars?: Record<string, string | number | undefined | null>) =>
    vanillaizeIfDemo(formString(shellCopy, key, key, vars))
  const { totals, goals, volunteerHoursRaised, volunteerHoursGoal, sponsorshipFromBank } = data
  const sponsorshipRaised =
    settings.getNumber('sponsorshipRaised', 0) + (sponsorshipFromBank ?? 0)
  const sponsorshipGoal = settings.getNumber('goalSponsorship', 5000)
  const sponsorshipEmail =
    parseStaffInboxes(
      settings.get('contactEmailSponsorship', DEFAULT_SPONSORSHIP_INBOXES),
    ).join(', ') || DEFAULT_SPONSORSHIP_INBOXES

  const ANNUAL_GOAL = annualGoal.goal

  const allocationRows = allocations.rows.map((row) => ({
    ...row,
    label: row.id === 'coveOps' ? vanillaizeIfDemo(row.label) : row.label,
  }))

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
      href: MEMBERSHIP_CHOOSE_PATH,
      cta: 'Join Now',
    },
    {
      id: 'store',
      icon: ShoppingBag,
      label: vanillaizeIfDemo('The Cove Digital Card'),
      description: vanillaizeIfDemo('Counted when a family loads the Cove Digital Card. Spending the balance at the window is not counted twice.'),
      raised: totals.store,
      goal:   goals.store,
      href: '/cove',
      cta: vanillaizeIfDemo('Load Cove Digital Card'),
    },
    {
      id: 'spiritWear',
      icon: Heart,
      label: vanillaizeIfDemo('The Cove shop'),
      description: vanillaizeIfDemo('Spirit wear and snack-window candy sold with Square, cash, Zelle, or the site shop.'),
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
      description: 'Platinum $2,500, Gold $1,500, or Silver $500. One payment for the 2026-27 school year.',
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
    <VisitorChrome pageKey="fundraising" mainClassName="flex-1">

        {/* Hero. overall progress */}
        <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--brand-green)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--brand-gold)' }}
            >
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              {normalizeFundraisingEyebrow(page.eyebrow)}
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
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{fs('hero.totalLabel')}</p>
                  <p className="text-4xl font-bold text-white">{fmtDollars(totalRaised)}</p>
                </div>
                <div className="pb-1 text-white/40 text-lg">{fs('hero.of')}</div>
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{fs('hero.goalLabel')}</p>
                  <p className="text-4xl font-bold" style={{ color: 'var(--brand-gold)' }}>{fmtDollars(ANNUAL_GOAL)}</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${overallPct}%`, backgroundColor: 'var(--brand-gold)' }}
                  role="progressbar"
                  aria-valuenow={overallPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium">{fs('hero.goalPct', { pct: overallPct })}</p>
                <p className="text-white/40 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  {data.fetchedAt
                    ? `Figures as of ${data.fetchedAt.replace('T', ' ').slice(0, 16)} UTC`
                    : 'Waiting for first Square or Plaid sync'}
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
        <section id="initiatives" className="scroll-mt-28 py-14 md:py-20" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: 'var(--brand-green)', color: 'white' }}
              >
                {fs('initiatives.eyebrow')}
              </div>
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                {fs('initiatives.title')}
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-xl mx-auto whitespace-pre-line">
                {fs('initiatives.body')}
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
                    id={initiative.id}
                    className="scroll-mt-28 bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] flex flex-col hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'var(--brand-soft)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{initiative.label}</h3>
                    <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                      {initiative.description}
                    </p>

                    {/* Raised only. per-area goals stay in Staff settings (not public) */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold" style={{ color: 'var(--brand-green)' }}>
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
                      style={{ backgroundColor: 'var(--brand-green)' }}
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
        <section id="allocations" className="scroll-mt-28 py-14 md:py-20 bg-white border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
              >
                {fs('allocations.eyebrow')}
              </div>
              <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                {fs('allocations.title')}
              </h2>
              <p className="text-[#5A6070] mt-3 whitespace-pre-line">
                {fs('allocations.body')}
              </p>
            </div>

            <div className="space-y-5">
              {allocationRows.map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                    <span style={{ color: 'var(--brand-green)' }}>
                      {fmtDollars(item.spent)}{' '}
                      <span className="text-[#5A6070] font-normal">
                        ({allocations.totalSpent > 0 ? `${item.pct}%` : '0%'})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-[var(--border)] rounded-full h-3">
                    <div
                      className="h-3 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: 'var(--brand-green)' }}
                      role="progressbar"
                      aria-valuenow={item.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.label}: ${fmtDollars(item.spent)} spent (${item.pct}% of total)`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sponsorships. deep link: /fundraising#sponsorship */}
        <section
          id="sponsorship"
          className="scroll-mt-28 py-14 md:py-20 border-t border-[var(--border)] bg-white"
          aria-labelledby="sponsorship-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
              >
                Community Partners
              </div>
              <h2 id="sponsorship-heading" className="text-3xl font-bold text-[#1A1A1A]">
                Sponsorships
              </h2>
              <p className="text-[#5A6070] mt-3 max-w-2xl mx-auto whitespace-pre-line">
                {vanillaizeIfDemo(
                  'One payment for the 2026-27 school year.\nChoose Platinum, Gold, or Silver below.',
                )}
              </p>
              <p className="mt-4">
                <a
                  href="/fundraising/sponsorship-packages-2026-27.pdf"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: 'var(--brand-green)' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download the 2026-27 sponsorship flyer (PDF)
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </p>
            </div>

            <SponsorshipPackages />

            {sponsors.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12" role="list">
                {sponsors.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-[var(--border)] bg-[#FAFCF9] p-5 flex flex-col"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
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
                        style={{ color: 'var(--brand-green)' }}
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

            <div id="become-a-sponsor" className="scroll-mt-28">
            <ProgramUiCopyBoundary>
              <DepartmentContactForm toEmail={sponsorshipEmail} variant="sponsorship" />
            </ProgramUiCopyBoundary>
            </div>

            <div className="mt-12 max-w-xl mx-auto">
              <PortalBusinessOwnerForm mode="public" />
            </div>
          </div>
        </section>

        {/* How to contribute */}
        <section id="contribute" className="scroll-mt-28 py-16" style={{ backgroundColor: 'var(--brand-warm)' }}>
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
                    className="bg-white rounded-2xl p-6 border border-[var(--border)] flex flex-col hover:shadow-md transition-shadow duration-300 group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'var(--brand-soft)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#5A6070] leading-relaxed flex-1 mb-4">{item.description}</p>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all"
                      style={{ color: 'var(--brand-green)' }}
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

    </VisitorChrome>
  )
}
