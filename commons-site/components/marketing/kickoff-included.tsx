import Link from 'next/link'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { COMMONS_LIST_PRICE_USD } from '@/lib/pricing'

const items = [
  {
    title: 'Public, family, and Staff',
    body: 'One school brand across the front door, household login, and officer workspaces.',
  },
  {
    title: 'Branded trial at kickoff',
    body: 'Logo, colors, and school name applied before your team logs in.',
  },
  {
    title: '1-on-1 launch support',
    body: 'Guided setup for domain, Google connect, and the pages you actually use.',
  },
  {
    title: 'Continuity built in',
    body: 'Roles inherit files and context when officers change each year.',
  },
] as const

export function MarketingKickoffIncluded() {
  return (
    <section className="border-y border-zinc-200 bg-white py-16 md:py-24" aria-labelledby="kickoff-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="badge-micro mb-4">Included at kickoff</div>
        <h2
          id="kickoff-heading"
          className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 md:text-4xl"
        >
          What your school gets when you start.
        </h2>
        <p className="lede-standard">
          {`One annual plan. $${COMMONS_LIST_PRICE_USD}/mo.
Public site, family login, and Staff included.`}
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.title} className="card-surface">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/pricing#checkout" className="btn-primary">
            {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
          </Link>
          <DemoBookingLink className="btn-secondary">Book a demo</DemoBookingLink>
        </div>
      </div>
    </section>
  )
}
