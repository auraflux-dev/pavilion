import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { StaffDashboard } from '@/components/staff/staff-dashboard'

export const dynamic = 'force-dynamic'

export default function StaffPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      <Navbar />
      <main id="main-content" className="flex-1">
        <StaffDashboard />
      </main>
      <Footer />
    </div>
  )
}
