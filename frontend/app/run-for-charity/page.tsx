import { redirect } from 'next/navigation'
import { RUN_FOR_CHARITY_REGISTER_PATH } from '@/lib/run-for-charity'

/** Old middle-page URL — registration lives on the event page now. */
export default function RunForCharityRedirectPage() {
  redirect(RUN_FOR_CHARITY_REGISTER_PATH)
}
