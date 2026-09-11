import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Work' }

const projects = [
  {
    name: 'Riverside Elementary PTO',
    product: PRODUCT_NAME,
    summary:
      'Pavilion product demo: public site, family login, and Staff on a sample elementary PTO brand.',
    category: 'Pavilion · Product demo',
    highlight: true,
    surfaces: [
      { title: 'Public', detail: 'Join, events, programs, and donate paths.' },
      { title: 'Family', detail: 'Household membership and volunteer shifts.' },
      { title: 'Staff', detail: 'Officer queues, tools, and role handoffs.' },
    ],
  },
  {
    name: 'Stone Hill Middle School PTO',
    product: PRODUCT_NAME,
    summary:
      'Pavilion customer: public site, family member portal, and Staff for a Loudoun middle school PTO.',
    category: 'Pavilion · Education · PTO',
    surfaces: [
      { title: 'Public', detail: 'Programs, events, and join paths for families.' },
      { title: 'Family', detail: 'Households join, renew, and stay in the loop.' },
      { title: 'Staff', detail: 'Officers run content, memberships, and ops.' },
    ],
  },
  {
    name: 'Lumi Education',
    product: PRODUCT_NAME,
    summary:
      'Pavilion customer: Brambleton tutoring and enrichment with bookings, family trust, and staff ops.',
    category: 'Pavilion · Education · Enrichment',
    surfaces: [
      { title: 'Public', detail: 'Programs and local presence on the school brand.' },
      { title: 'Family', detail: 'Household registration and schedules.' },
      { title: 'Staff', detail: 'Season queues for coordinators.' },
    ],
  },
  {
    name: 'Enrichment registration season',
    product: PRODUCT_NAME,
    summary:
      'Pavilion pattern: program catalogs and household registration without form-tool sprawl.',
    category: 'Pavilion · Enrichment',
    surfaces: [
      { title: 'Public', detail: 'Catalog and registration on school brand.' },
      { title: 'Family', detail: 'Students and enrollments in one login.' },
      { title: 'Staff', detail: 'Season queues for chairs and coordinators.' },
    ],
  },
  {
    name: 'Booster and club ops',
    product: PRODUCT_NAME,
    summary:
      'Pavilion pattern: volunteer shifts, spirit sales, and announcements when Facebook groups stop scaling.',
    category: 'Pavilion · Boosters · Clubs',
    surfaces: [
      { title: 'Public', detail: 'Join and event pages for the program.' },
      { title: 'Family', detail: 'Shift sign-ups and store activity.' },
      { title: 'Staff', detail: 'Season handoffs without lost folders.' },
    ],
  },
] as const

export default function WorkPage() {
  return (
    <div className="bg-zinc-50">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-20">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Work
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {PRODUCT_NAME} work for school community groups.
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {`Education, PTO, and enrichment run on Pavilion.
Same three surfaces: public, family, and Staff.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <DemoBookingLink className="btn-primary">Book a demo</DemoBookingLink>
            <Link href="/process" className="btn-secondary">
              See the process
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.name}
              className={
                'highlight' in project && project.highlight
                  ? 'card-surface border-emerald-200 bg-emerald-50/40'
                  : 'card-surface'
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {project.category}
                </p>
                <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                  {project.product}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                {project.name}
              </h2>
              <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
                {project.summary}
              </p>
              <ul className="mt-5 space-y-2 border-t border-zinc-200/80 pt-4">
                {project.surfaces.map((surface) => (
                  <li key={surface.title} className="text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">{surface.title}.</span>{' '}
                    {surface.detail}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
