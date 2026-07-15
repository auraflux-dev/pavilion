import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { MemberDashboard } from '@/components/member-portal/member-dashboard'
import { PageHero } from '@/components/page-hero'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { CONTACT_DEFAULTS } from '@/lib/defaults/page-content'

export const metadata = {
  title: 'Member Portal | SHMS PTO',
  description:
    'Parent hub: account, students, store purchases, program calendar, and instructor messages.',
}

// No ISR — always fresh for authenticated pages
export const dynamic = 'force-dynamic'

export default async function MemberPortalPage() {
  const [settings, hero, portal] = await Promise.all([
    getSiteSettings(),
    getPageContent('member-portal'),
    getPageContent('portal'),
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
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        <PageHero content={hero} compact />

        <section className="py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <MemberDashboard
              link6={link6}
              link7={link7}
              link8={link8}
              grades={grades}
              copy={{
                paidTitle: portal.sectionTitle,
                paidBody: portal.sectionBody,
                freeTitle: portal.title,
                freeBody: portal.body,
                emptyTitle: portal.bullets[0] || 'Welcome to the SHMS PTO',
                emptyBody: portal.bullets[1] || '',
                upgradeBody: portal.bullets[2] || '',
              }}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
