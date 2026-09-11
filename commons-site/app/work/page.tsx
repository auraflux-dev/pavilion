import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'

export const metadata: Metadata = { title: 'Work' }

export default function WorkPage() {
  return (
    <div className="bg-zinc-50">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-20">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Work
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Case study: Stone Hill Middle School PTO.
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
            {`Live on www.shmspto.org.
Public site, family login, and Staff on the school brand.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.shmspto.org"
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit shmspto.org
            </a>
            <DemoBookingLink className="btn-secondary">Book a demo</DemoBookingLink>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <article className="card-surface border-emerald-200 bg-emerald-50/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Pavilion · Customer #1 · Loudoun County, VA
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Stone Hill Middle School PTO
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
              {`The full three-surface stack for a live middle school PTO.
Parents see the school. Officers work in Staff.
History stays with the organization when chairs change.`}
            </p>
            <ul className="mt-6 grid gap-4 border-t border-emerald-200/80 pt-6 sm:grid-cols-3">
              <li>
                <p className="text-sm font-semibold text-slate-900">Public website</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Membership, events, programs, fundraising, and school pages on the PTO brand.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold text-slate-900">Family login</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Household profiles, renewals, volunteer shifts, and store activity in one login.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold text-slate-900">Staff portal</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Day-to-day ops, content, and role handoffs for the officer team.
                </p>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://www.shmspto.org"
                className="btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open live site
              </a>
              <Link href="/process" className="btn-secondary">
                See the process
              </Link>
            </div>
          </article>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="card-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Product demo
              </p>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Riverside sample school</h3>
              <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
                Walk the same surfaces on a sample elementary PTO brand during a booked demo.
              </p>
            </article>
            <article className="card-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Continuity pattern
              </p>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Annual officer handoffs</h3>
              <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
                Roles inherit files and queues so June turnover does not wipe institutional memory.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
