import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingPanel } from '@/components/demo-booking-panel'
import { PRODUCT_NAME } from '@/lib/brand'
import { getDemoBookingUrl } from '@/lib/demo-booking'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Book a demo' }

export default function ContactPage() {
  const hasCalendar = Boolean(getDemoBookingUrl())

  return (
    <section className="bg-[var(--brand-mist)] py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] ring-1 ring-[var(--brand-line)]">
          Book a demo
        </div>
        <h1 className="font-sans text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Talk with us about {PRODUCT_NAME} for your school.
        </h1>
        <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          {`We will walk your board through Staff, the public site, and family login.
Or start with the Riverside demo on your own time.`}
        </p>

        <div className="mt-10 space-y-6">
          {hasCalendar ? (
            <DemoBookingPanel />
          ) : (
            <div className="card-surface space-y-3">
              <p className="text-base font-normal leading-relaxed text-[var(--ink-muted)]">
                Email us to book a walkthrough. Include your school name and a good time window.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} demo request`)}`}
                className="btn-primary !px-5 !py-3"
              >
                Email {CONTACT_EMAIL}
              </a>
            </div>
          )}

          <div className="card-surface">
            <p className="text-sm font-semibold text-[var(--brand-text)]">Prefer to look first?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={DEMO_URL} className="btn-secondary">
                Try the Riverside demo
              </a>
              <Link href="/pricing#checkout" className="btn-secondary">
                Start at checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
