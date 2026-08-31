import { Suspense } from 'react'
import { StaffDashboard } from '@/components/staff/staff-dashboard'
import { getPageContent } from '@/lib/api/page-content'
import { getStaffPortalCopy } from '@/lib/api/staff-portal-copy'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'
import { StaffInlineEdit } from '@/components/site/staff-inline-edit'
import { CmsCopyBoundary } from '@/components/cms/cms-copy-boundary'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const [theme, staffCopy] = await Promise.all([
    getPageContent('staff-portal'),
    getStaffPortalCopy(),
  ])
  return (
    <StaffInlineEdit>
      <CmsCopyBoundary pages={['staff-portal']}>
        <PageThemeStyles pageKey="staff-portal" css={theme.customCss ?? ''} />
        <PageThemeRoot pageKey="staff-portal">
          <Suspense
            fallback={
              <p className="text-center py-16 text-sm text-[#5A6070]">Loading staff…</p>
            }
          >
            <StaffDashboard staffCopy={staffCopy} />
          </Suspense>
        </PageThemeRoot>
      </CmsCopyBoundary>
    </StaffInlineEdit>
  )
}
