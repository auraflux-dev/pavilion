import { redirect } from 'next/navigation'
import { DEMO_URL } from '@/lib/pricing'

export default function StaffBrandRedirect() {
  redirect(`${DEMO_URL}/staff?view=strategy`)
}
