import { notFound, redirect } from 'next/navigation'
import { RUN_FOR_CHARITY_REGISTER_PATH } from '@/lib/run-for-charity'
import { isDemoInstance } from '@/lib/demo/instance'

/** Old middle-page URL — registration lives on the event page now. */
export default function RunForCharityRedirectPage() {
  if (isDemoInstance()) notFound()
  redirect(RUN_FOR_CHARITY_REGISTER_PATH)
}
