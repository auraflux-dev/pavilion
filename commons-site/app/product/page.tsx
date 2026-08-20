import type { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Product' }

const sections = [
  {
    title: 'Public site',
    body: `Membership, events, programs, and fundraising on your school brand.\nParents do not see ${PRODUCT_NAME}. They see your PTO.`,
  },
  {
    title: 'Family portal',
    body: 'One household login for students, membership, and the store card.\nBuilt for fall rush, not a power-user admin console.',
  },
  {
    title: 'Staff portal',
    body: 'Role workspaces for the board.\nGoogle and Canva sit inside Staff so the next treasurer inherits the year.',
  },
]

export default function ProductPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Product</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Three surfaces.\nOne operating system for the school year.`}
      </p>
      <div className="mt-12 space-y-12">
        {sections.map((s) => (
          <section key={s.title} className="border-t border-[var(--line)] pt-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{s.title}</h2>
            <p className="mt-3 whitespace-pre-line text-[var(--ink-muted)]">{s.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap gap-3">
        <Link
          href="/start"
          className="rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--accent)]"
        >
          Start at $399/mo
        </Link>
        <Link href="/pricing" className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold">
          Pricing
        </Link>
      </div>
    </div>
  )
}
