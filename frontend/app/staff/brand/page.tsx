import { redirect } from 'next/navigation'

/** Brand strategy (not Client Staff visual brand at /staff?view=brand). */
export default function StaffBrandStrategyRedirectPage() {
  redirect('/staff?view=strategy')
}
