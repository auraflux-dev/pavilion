import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoBookingPanel } from '@/components/demo-booking-panel'
import { PRODUCT_NAME } from '@/lib/brand'
import { getDemoBookingUrl } from '@/lib/demo-booking'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164, DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Book a demo' }

export default function ContactPage() {
  const hasCalendar = Boolean(getDemoBookingUrl())

  return (
    <section className="bg-zinc-50 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Book a demo
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Talk with us about {PRODUCT_NAME} for your school.
        </h1>
        <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
          {`We will walk your team through Staff, the public site, and family login.
Or start with the product demo on your own time.`}
        </p>

        <div className="mt-10 space-y-6">
          <div className="card-surface space-y-3">
            <p className="text-lg font-semibold text-slate-900">Call or text</p>
            <p className="text-base font-normal leading-relaxed text-slate-600">
              Reach us by phone or text anytime.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:${CONTACT_PHONE_E164}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.5 5.5c0-.8.7-1.5 1.5-1.5h2.2c.6 0 1.1.4 1.3 1l.8 2.4c.2.5 0 1.1-.4 1.4L7.3 10.5a12.5 12.5 0 0 0 6.2 6.2l1.7-1.6c.3-.4.9-.6 1.4-.4l2.4.8c.6.2 1 .7 1 1.3V20c0 .8-.7 1.5-1.5 1.5C9.9 21.5 2.5 14.1 2.5 5.5Z"
                  />
                </svg>
                <span>Call {CONTACT_PHONE_DISPLAY}</span>
              </a>
              <a
                href={`sms:${CONTACT_PHONE_E164}`}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
                  />
                  <path strokeLinecap="round" d="M8 9h8M8 12h5" />
                </svg>
                <span>Text {CONTACT_PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>

          {hasCalendar ? (
            <div className="space-y-3">
              <p className="max-w-2xl text-base font-normal leading-relaxed whitespace-pre-line text-slate-600 md:text-lg">
                {`Easy team scheduling:
Invite your principal, co-chairs, or treasurer directly to the invite.`}
              </p>
              <DemoBookingPanel />
            </div>
          ) : (
            <div className="card-surface space-y-3">
              <p className="text-base font-normal leading-relaxed text-slate-600">
                Email us to book a walkthrough. Include your school name and a good time window.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} demo request`)}`}
                className="btn-primary"
              >
                Email {CONTACT_EMAIL}
              </a>
            </div>
          )}

          <div className="card-surface">
            <p className="text-lg font-semibold text-slate-900">Prefer to look first?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={DEMO_URL} className="btn-secondary">
                Try the demo
              </a>
              <Link href="/pricing#checkout" className="btn-secondary">
                Get started
              </Link>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm font-normal leading-relaxed text-slate-600">
              {`Need materials for your executive team?
We send a summary deck ahead of your call.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
