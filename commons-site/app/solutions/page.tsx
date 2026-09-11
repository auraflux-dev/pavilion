import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Solutions' }

const audiences = [
  {
    label: 'PTOs & PTAs',
    title: 'School parent organizations',
    body: `Membership, events, fundraising, and officer handoffs.
Parents see the school. Officers work in Staff.`,
  },
  {
    label: 'Boosters',
    title: 'Sports and arts boosters',
    body: `Volunteer shifts, spirit sales, and donor continuity across seasons.
Keep history with the program, not a coach laptop.`,
  },
  {
    label: 'Enrichment',
    title: 'After-school and camps',
    body: `Program catalogs, household registration, and staff queues for fall rush.
One family login instead of form sprawl.`,
  },
  {
    label: 'Clubs',
    title: 'Clubs and affinity groups',
    body: `Join paths, announcements, and volunteer ops on your brand.
Scale past Facebook groups and shared drives.`,
  },
  {
    label: 'District partners',
    title: 'Schools and districts',
    body: `Give each PTO its own brand while support stays with Pavilion.
Platform Staff serves the fleet when you need help.`,
  },
  {
    label: 'Education nonprofits',
    title: 'Local education orgs',
    body: `Directories, events, and member billing without stacking five tools.
Same three surfaces. Your identity out front.`,
  },
] as const

const surfaces = [
  {
    badge: 'Front door',
    title: 'Public website',
    body: 'Join, events, programs, and fundraising on your school domain and colors.',
  },
  {
    badge: 'Households',
    title: 'Family login',
    body: 'One login for membership, students, volunteer shifts, and store activity.',
  },
  {
    badge: 'Officers',
    title: 'Staff portal',
    body: 'Setup, tools, and day-to-day work that survives annual team handoffs.',
  },
] as const

export default function SolutionsPage() {
  return (
    <div className="bg-zinc-50">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-20">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Solutions
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Built for school community groups that need three surfaces.
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {`Public site. Family login. Staff.
One product for PTOs, boosters, enrichment, and partners.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <DemoBookingLink className="btn-primary">Book a demo</DemoBookingLink>
            <Link href="/pricing" className="btn-secondary">
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Core</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Three parts. One school brand.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {surfaces.map((s) => (
              <article key={s.title} className="card-surface">
                <span className="inline-flex rounded-full bg-emerald-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {s.badge}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Who it fits
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Solutions by organization type.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((item) => (
              <article key={item.label} className="card-surface">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {item.label}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
