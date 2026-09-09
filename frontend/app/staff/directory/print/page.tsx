import { StaffDirectoryPrint } from '@/components/staff/staff-directory-print'

export const dynamic = 'force-dynamic'

export default async function StaffDirectoryPrintPage({
  searchParams,
}: {
  searchParams?: Promise<{ tier?: string }>
}) {
  const sp = searchParams ? await searchParams : {}
  const tier = String(sp.tier ?? 'paid').trim() || 'paid'
  return <StaffDirectoryPrint initialTier={tier} />
}
