import { redirect } from 'next/navigation'
import { DEMO_URL } from '@/lib/pricing'

export default function StaffSeoRedirect() {
  redirect(`${DEMO_URL}/staff?view=seo`)
}
