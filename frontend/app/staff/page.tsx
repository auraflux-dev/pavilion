import { Suspense } from 'react'
import { StaffDashboard } from '@/components/staff/staff-dashboard'

export const dynamic = 'force-dynamic'

export default function StaffPage() {
  return (
    <Suspense fallback={<p className="text-center py-16 text-sm text-[#5A6070]">Loading staff…</p>}>
      <StaffDashboard />
    </Suspense>
  )
}
