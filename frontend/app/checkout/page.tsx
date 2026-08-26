import { Suspense } from 'react'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { CheckoutPageClient } from '@/components/checkout/checkout-page-client'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

export const metadata = {
  title: vanillaizeIfDemo('Checkout | Stone Hill Middle School PTO'),
  description: vanillaizeIfDemo('Pay for everything in your bag in one checkout.'),
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-16 text-sm text-[#5A6070]">Loading checkout…</div>}>
          <CheckoutPageClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
