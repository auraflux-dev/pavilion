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
        <div className="badge-micro mb-5">Book a demo</div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Talk with us about {PRODUCT_NAME} for your school.
        </h1>
        <p className="mt-3 mb-6 max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
          {`We will walk your board through Staff, the public site, and family login.
Or start with the product demo on your own time.`}
        </p>

        <div className="mt-10 space-y-6">
          <div className="card-surface space-y-3">
            <p className="text-lg font-semibold text-slate-900">Call or text</p>
            <p className="text-base font-normal leading-relaxed text-slate-600">
              Same number as AuraFlux. Call or SMS anytime.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${CONTACT_PHONE_E164}`} className="btn-primary">
                Call {CONTACT_PHONE_DISPLAY}
              </a>
              <a href={`sms:${CONTACT_PHONE_E164}`} className="btn-secondary">
                Text {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>

          {hasCalendar ? (
            <div className="space-y-3">
              <p className="max-w-xl whitespace-pre-line text-base font-normal leading-relaxed text-slate-600 md:text-lg">
                {`Board-friendly scheduling:
Feel free to add your principal, board officers, or committee chairs directly to the invite.`}
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
              {`Need materials for your next board meeting?
We send an executive summary and financial deck ahead of your call.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
