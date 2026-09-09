import { StaffCheckInKiosk } from '@/components/staff/staff-check-in-kiosk'

export default async function StaffCheckInPage({
  searchParams,
}: {
  searchParams?: Promise<{ event?: string }>
}) {
  const sp = searchParams ? await searchParams : {}
  const eventKey = String(sp.event ?? 'default').trim() || 'default'
  return (
    <main className="min-h-screen bg-[var(--background,#f7f5f1)]">
      <StaffCheckInKiosk eventKey={eventKey} />
    </main>
  )
}
