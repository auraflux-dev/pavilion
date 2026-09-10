import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_URL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Thanks' }

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
        Thank you
      </h1>
      <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
        {`We have your school on the list.
We will email you within one business day with next steps.`}
      </p>
      <p className="mt-6 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
        {`While you wait, walk the product demo as a board member.`}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={DEMO_URL} className="btn-primary">
          Open the demo
        </a>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  )
}
