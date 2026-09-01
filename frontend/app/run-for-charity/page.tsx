import { notFound, redirect } from 'next/navigation'
import { BEST_RUNNERS_SIGNUP_URL } from '@/lib/run-for-charity'
import { isDemoInstance } from '@/lib/demo/instance'

/** Old middle-page URL. Send families straight to Best Runners with SHMS applied. */
export default function RunForCharityRedirectPage() {
  if (isDemoInstance()) notFound()
  redirect(BEST_RUNNERS_SIGNUP_URL)
}
