import Link from 'next/link'
import { CONTACT_EMAIL, DEMO_URL } from '@/lib/pricing'

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="space-y-2 whitespace-pre-line text-sm text-[var(--ink-muted)]">
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">Commons</p>
          <p>{`The PTO operating system.\nBuilt by Auraflux.`}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/pricing" className="text-[var(--ink)] hover:underline">
            Pricing
          </Link>
          <Link href="/start" className="text-[var(--ink)] hover:underline">
            Start at $399/mo
          </Link>
          <a href={DEMO_URL} className="text-[var(--ink)] hover:underline">
            Riverside demo
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--ink)] hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
