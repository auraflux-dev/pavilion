import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { MemberDashboard } from '@/components/member-portal/member-dashboard'

export const metadata = {
  title: 'Member Portal | SHMS PTO',
  description: 'View your store card balance, membership status, and upcoming events.',
}

// No ISR — always fresh for authenticated pages
export const dynamic = 'force-dynamic'

export default function MemberPortalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        {/* Hero */}
        <section className="py-12 md:py-16" style={{ backgroundColor: '#085508' }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Member Portal</h1>
            <p className="text-white/70 text-base">
              Your store card balance, membership, and quick links — all in one place.
            </p>
          </div>
        </section>

        {/* Dashboard */}
        <section className="py-10 md:py-14">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <MemberDashboard />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
