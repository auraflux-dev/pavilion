import { AnnouncementBar } from '@/components/announcement-bar'
import { MemberShell } from '@/components/shells/member-shell'
import { MemberDashboard } from '@/components/member-portal/member-dashboard'
import { ActAsBanner } from '@/components/staff/act-as-banner'
import { PageHero } from '@/components/page-hero'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { getPortalCopy } from '@/lib/api/portal-copy'
import { getPageStrings } from '@/lib/api/page-strings'
import { getPortalFormCopy } from '@/lib/api/portal-form-copy'
import { CONTACT_DEFAULTS } from '@/lib/defaults/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'
import { PortalFormCopyProvider } from '@/components/member-portal/portal-form-copy-context'

export const metadata = {
  title: 'Member Portal',
  description:
    'Parent hub: account, students, store purchases, program calendar, and instructor messages.',
}

// No ISR. always fresh for authenticated pages
export const dynamic = 'force-dynamic'

export default async function MemberPortalPage() {
  const [settings, hero, copy, notices, forms] = await Promise.all([
    getSiteSettings(),
    getPageContent('member-portal'),
    getPortalCopy(),
    getPageStrings('portal-notices'),
    getPortalFormCopy(),
  ])
  const link6 = settings.get('announcement6thLink', '')
  const link7 = settings.get('announcement7thLink', '')
  const link8 = settings.get('announcement8thLink', '')
  const grades = settings
    .get('portalGrades', CONTACT_DEFAULTS.portalGrades)
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)

  return (
    <MemberShell>
      <PageThemeStyles pageKey="member-portal" css={hero.customCss ?? ''} />
      <AnnouncementBar />
      <ActAsBanner />

      <PageThemeRoot pageKey="member-portal" className="flex-1 flex flex-col">
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <PageHero content={hero} compact />

        <section className="py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <PortalFormCopyProvider value={forms}>
              <MemberDashboard
                link6={link6}
                link7={link7}
                link8={link8}
                grades={grades}
                copy={copy}
                notices={notices}
              />
            </PortalFormCopyProvider>
          </div>
        </section>
      </main>
      </PageThemeRoot>
    </MemberShell>
  )
}
