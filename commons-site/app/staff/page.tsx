import { redirect } from 'next/navigation'
import { DEMO_URL } from '@/lib/pricing'

/**
 * One Platform Staff door for operators.
 * Not linked from marketing. Bookmark www.onpavilion.com/staff.
 * Auth on the product host allows @onpavilion.com only.
 */
export default function StaffPathRedirect() {
  redirect(`${DEMO_URL}/staff`)
}
