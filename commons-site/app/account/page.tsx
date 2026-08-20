import type { Metadata } from 'next'
import { AccountDashboard, AccountSignInForm } from '@/components/account-client'
import { ADDON_CATALOG } from '@/lib/addons'
import { readAccountEmail } from '@/lib/account'
import { PRODUCT_NAME } from '@/lib/brand'
import { findLatestSubscriptionByEmail } from '@/lib/db'
import { CONTACT_EMAIL } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Account' }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; addon?: string }>
}) {
  const params = await searchParams
  const email = await readAccountEmail()

  let sub: Awaited<ReturnType<typeof findLatestSubscriptionByEmail>> = null
  if (email) {
    try {
      sub = await findLatestSubscriptionByEmail(email)
    } catch (err) {
      console.error('account page subscription lookup failed', err)
    }
  }

  const addons = ADDON_CATALOG.map((a) => ({
    id: a.id,
    title: a.title,
    usd: a.usd,
    ready: Boolean(a.priceId()),
  }))

  const errorCopy: Record<string, string> = {
    missing: 'That sign-in link was incomplete.',
    expired: 'That sign-in link expired or was already used. Request a new one.',
    failed: 'Sign-in failed. Request a new link.',
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Account</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--ink-muted)]">
        {`Billing for ${PRODUCT_NAME}.\nInvoices and payment methods via HSKRG LLC on Stripe.`}
      </p>

      {params.error && errorCopy[params.error] ? (
        <p className="mt-4 text-sm text-red-800">{errorCopy[params.error]}</p>
      ) : null}
      {params.addon === 'ok' ? (
        <p className="mt-4 text-sm text-[var(--accent)]">Add-on checkout finished. Refresh if status looks stale.</p>
      ) : null}

      {email ? (
        <AccountDashboard
          email={email}
          schoolName={sub?.school_name || ''}
          status={sub?.status || 'no_subscription_row'}
          hasCustomer={Boolean(sub?.stripe_customer_id)}
          addons={addons}
        />
      ) : (
        <>
          <AccountSignInForm />
          <p className="mt-6 whitespace-pre-line text-sm text-[var(--ink-muted)]">
            {`Need a hand?\n${CONTACT_EMAIL}`}
          </p>
        </>
      )}
    </div>
  )
}
