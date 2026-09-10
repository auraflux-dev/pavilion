import type { Metadata } from 'next'
import { AccountDashboard, AccountSignInForm } from '@/components/account-client'
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

  const errorCopy: Record<string, string> = {
    missing: 'That sign-in link was incomplete.',
    expired: 'That sign-in link expired or was already used. Request a new one.',
    failed: 'Sign-in failed. Request a new link.',
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
        Account
      </h1>
      <p className="mt-4 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
        {`Billing for ${PRODUCT_NAME}.
Manage invoices and payment methods for your school workspace.
Your board works in Staff, not a separate member portal.`}
      </p>

      {params.error && errorCopy[params.error] ? (
        <p className="mt-4 text-sm text-red-800">{errorCopy[params.error]}</p>
      ) : null}

      {email ? (
        <AccountDashboard
          email={email}
          schoolName={sub?.school_name || ''}
          status={sub?.status || 'no_subscription_row'}
          hasCustomer={Boolean(sub?.stripe_customer_id)}
        />
      ) : (
        <>
          <AccountSignInForm />
          <p className="mt-6 whitespace-pre-line text-base font-normal leading-relaxed text-slate-600">
            {`Need a hand?
${CONTACT_EMAIL}`}
          </p>
        </>
      )}
    </div>
  )
}
