import { MemberShell } from '@/components/shells/member-shell'
import { PaymentMethodsPanel } from '@/components/member-portal/payment-methods-panel'

export const metadata = {
  title: 'Saved Payment Methods',
  description: 'View or remove the card or PayPal saved for SHMS PTO checkout.',
}

export default function MemberPortalPaymentMethodsPage() {
  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--brand-green)' }}
            >
              Member portal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A]">Saved Payment Methods</h1>
            <p className="mt-2 text-sm text-[#5A6070] whitespace-pre-line">
              {`Manage the debit or credit card saved with Square, or save PayPal for one-tap checkout.
Add a card or PayPal on this page. Auto Top-Off for Cove lives here too.`}
            </p>
          </div>
          <PaymentMethodsPanel />
        </div>
      </main>
    </MemberShell>
  )
}
