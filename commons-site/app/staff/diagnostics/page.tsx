import { redirect } from 'next/navigation'
import { DEMO_URL } from '@/lib/pricing'

export default function StaffDiagnosticsRedirect() {
  redirect(`${DEMO_URL}/staff?view=diagnostics`)
}
