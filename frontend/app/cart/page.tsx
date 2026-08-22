import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { CartPageClient } from '@/components/cart/cart-page-client'

export const metadata = {
  title: 'Cart | Stone Hill Middle School PTO',
  description: 'Review items and check out when you are ready.',
}

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <CartPageClient />
      </main>
      <Footer />
    </div>
  )
}
