import { MemberShell } from '@/components/shells/member-shell'
import { PaymentMethodsPanel } from '@/components/member-portal/payment-methods-panel'
import { PortalFormCopyProvider } from '@/components/member-portal/portal-form-copy-context'
import { getPortalFormCopy } from '@/lib/api/portal-form-copy'
import { formCopy } from '@/lib/api/portal-form-copy-shared'

export const metadata = {
  title: 'Payment methods',
  description: 'View or remove the card or PayPal saved for SHMS PTO checkout.',
}

export const dynamic = 'force-dynamic'

export default async function MemberPortalPaymentMethodsPage() {
  const forms = await getPortalFormCopy()
  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <PortalFormCopyProvider value={forms}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-4">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--brand-green)' }}
              >
                {formCopy(forms, 'paymentPage.eyebrow')}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A]">
                {formCopy(forms, 'paymentPage.title')}
              </h1>
              <p className="mt-2 text-sm text-[#5A6070] whitespace-pre-line">
                {formCopy(forms, 'paymentPage.body')}
              </p>
            </div>
            <PaymentMethodsPanel />
          </div>
        </PortalFormCopyProvider>
      </main>
    </MemberShell>
  )
}
