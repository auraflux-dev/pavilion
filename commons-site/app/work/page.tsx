import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'

export const metadata: Metadata = { title: 'Work' }

const projects = [
  {
    name: 'Riverside sample school',
    summary:
      'Product demo pattern: public site, family login, and Staff on a sample elementary PTO brand.',
    category: 'Product demo',
    highlight: true,
    surfaces: [
      { title: 'Public', detail: 'Join, events, programs, and donate paths.' },
      { title: 'Family', detail: 'Household membership and volunteer shifts.' },
      { title: 'Staff', detail: 'Officer queues, tools, and role handoffs.' },
    ],
  },
  {
    name: 'School PTO continuity pattern',
    summary:
      'Live school deployments where history, donor lists, and year files stay with the school when officers change.',
    category: 'Education · PTO',
    surfaces: [
      { title: 'Public', detail: 'School-branded front door for families.' },
      { title: 'Family', detail: 'One household login for fall rush.' },
      { title: 'Staff', detail: 'Role inherits Drive, Canva, and queues.' },
    ],
  },
  {
    name: 'Enrichment registration season',
    summary:
      'Program catalogs and household registration without stacking form tools and personal spreadsheets.',
    category: 'Enrichment',
    surfaces: [
      { title: 'Public', detail: 'Catalog and registration on school brand.' },
      { title: 'Family', detail: 'Students and enrollments in one login.' },
      { title: 'Staff', detail: 'Season queues for chairs and coordinators.' },
    ],
  },
  {
    name: 'Booster and club ops',
    summary:
      'Volunteer shifts, spirit sales, and announcements when Facebook groups stop scaling.',
    category: 'Boosters · Clubs',
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
            Proof patterns for school community groups.
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {`Same three surfaces every time.
Public, family, and Staff on the school brand.`}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {project.category}
              </p>
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
