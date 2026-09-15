import { redirect } from 'next/navigation'

export default function StaffDiagnosticsRedirectPage() {
  redirect('/staff?view=diagnostics')
}
