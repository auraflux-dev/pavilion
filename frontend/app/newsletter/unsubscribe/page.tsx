import Link from 'next/link'
import {
  maskEmail,
  recordNewsletterUnsubscribe,
  verifyNewsletterUnsubscribeToken,
} from '@/lib/staff/newsletter-unsubscribe'

export const metadata = {
  title: 'Unsubscribe · SHMS PTO',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function NewsletterUnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams
  const email = verifyNewsletterUnsubscribeToken(token ?? '')
  if (!email) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Unsubscribe link invalid</h1>
        <p className="mt-3 text-sm text-[#5A6070]">
          This link may be broken or already used. Email president@shmspto.org and we will remove you
          manually.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-[var(--brand-green)] underline">
            Back to shmspto.org
          </Link>
        </p>
      </main>
    )
  }

  await recordNewsletterUnsubscribe(email)

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">You are unsubscribed</h1>
      <p className="mt-3 text-sm text-[#5A6070]">
        {maskEmail(email)} will no longer receive SHMS PTO newsletter or marketing emails from this
        list.
      </p>
      <p className="mt-3 text-sm text-[#5A6070]">
        Membership receipts and one-off program messages may still arrive when you sign up for an
        event or purchase.
      </p>
      <p className="mt-6">
        <Link href="/newsletter" className="text-[var(--brand-green)] underline">
          Resubscribe on our website
        </Link>
        {' · '}
        <Link href="/" className="text-[var(--brand-green)] underline">
          shmspto.org
        </Link>
      </p>
    </main>
  )
}
