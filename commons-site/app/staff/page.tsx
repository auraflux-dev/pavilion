import { redirect } from 'next/navigation'

/**
 * Interim: www still deploys from commons-site until DNS attaches
 * www.onpavilion.com to commons-pto-demo. Then /staff is native there.
 */
export default function StaffPathRedirect() {
  redirect('https://commons-pto-demo.vercel.app/staff')
}
