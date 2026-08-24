import { Suspense } from 'react'
import { StaffDashboard } from '@/components/staff/staff-dashboard'
import { getPageContent } from '@/lib/api/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const theme = await getPageContent('staff-portal')
  return (
    <>
      <PageThemeStyles pageKey="staff-portal" css={theme.customCss ?? ''} />
      <PageThemeRoot pageKey="staff-portal">
        <Suspense fallback={<p className="text-center py-16 text-sm text-[#5A6070]">Loading staff…</p>}>
          <StaffDashboard />
        </Suspense>
      </PageThemeRoot>
    </>
  )
}
