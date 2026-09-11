'use client'

import { useState } from 'react'

const faqs = [
  {
    q: 'How long does launch take?',
    a: `Most schools go live in about 30 minutes of guided setup after a branded trial.
We walk domain, colors, and the pages you offer.`,
  },
  {
    q: 'Is there a long-term lock beyond the annual plan?',
    a: `The plan is billed annually for 12 months.
You lock your school rate for as long as you stay.`,
  },
  {
    q: 'Do parents see Pavilion?',
    a: `No. Parents see your school brand on the public site and family login.
Pavilion stays in Staff.`,
  },
  {
    q: 'What happens when officers change?',
    a: `Incoming chairs inherit the role workspace, files, and configuration.
History stays attached to the school.`,
  },
  {
    q: 'Do you take a cut of Square sales?',
    a: `No Pavilion transaction fee on parent cards or store sales.
Your school keeps its Square account.`,
  },
] as const

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="border-t border-zinc-200 bg-white py-16 md:py-20" aria-labelledby="pricing-faq">
      <div className="mx-auto max-w-3xl px-5">
        <div className="badge-micro mb-4">FAQ</div>
        <h2 id="pricing-faq" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Questions school leaders ask first.
        </h2>
        <ul className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {faqs.map((item, index) => {
            const isOpen = open === index
            return (
              <li key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="text-base font-semibold text-slate-900">{item.q}</span>
                  <span className="text-lg font-semibold text-emerald-900" aria-hidden>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? (
                  <p className="pb-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
                    {item.a}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
