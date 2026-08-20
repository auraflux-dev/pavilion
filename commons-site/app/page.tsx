import Link from 'next/link'
import { COMMONS_LIST_PRICE_USD, DEMO_URL } from '@/lib/pricing'

export default function HomePage() {
  return (
    <>
      <section className="hero-plane relative min-h-[88vh] overflow-hidden text-[#f3efe6]">
        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-5xl flex-col justify-end gap-8 px-5 pb-16 pt-28">
          <p className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight sm:text-7xl md:text-8xl">
            Commons
          </p>
          <p className="max-w-xl whitespace-pre-line text-lg text-[#e8e1d4] sm:text-xl">
            {`The PTO operating system.\nPublic site, family portal, and staff portal.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-md bg-[#f3efe6] px-5 py-3 text-sm font-semibold text-[#12231f] hover:bg-white"
            >
              {`Start at $${COMMONS_LIST_PRICE_USD}/mo`}
            </Link>
            <a
              href={DEMO_URL}
              className="rounded-md border border-[#f3efe6]/50 px-5 py-3 text-sm font-semibold text-[#f3efe6] hover:bg-white/10"
            >
              Try the demo
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          One login for the whole board year
        </h2>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
          {`Parents join and pay on your branded site.\nStaff run membership, events, and communications in one workspace.\nYour school keeps its own Square for parent cards.`}
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: 'Public site',
              body: 'Membership, events, programs, and fundraising without a stitch of tools.',
            },
            {
              title: 'Family portal',
              body: 'Household, students, and store card in one parent login.',
            },
            {
              title: 'Staff portal',
              body: 'Roles, newsletters, calendar, and board workspaces that survive turnover.',
            },
          ].map((card) => (
            <div key={card.title} className="border-t border-[var(--line)] pt-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl">{card.title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{card.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/product" className="text-[var(--accent)] hover:underline">
            See the product
          </Link>
          <Link href="/pricing" className="text-[var(--accent)] hover:underline">
            See pricing
          </Link>
        </div>
      </section>
    </>
  )
}
