import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { RunForCharityRegisterBridge } from '@/components/run-for-charity/register-bridge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Run for Charity · School code SHMS | SHMS PTO',
  description:
    'Register for Best Runners Run for Charity with Stone Hill school code SHMS so registration fees come back to our school.',
}

/**
 * Bridge page: Best Runners does not accept school codes via URL query params,
 * so we hand parents the code first, then send them to signup.
 */
export default function RunForCharityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
            <header className="text-center space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#085508]">
                Best Runners · School partnership
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
                Run for Charity registration
              </h1>
              <p className="text-[#5A6070] max-w-xl mx-auto">
                Best Runners runs the race. Use our school code so Stone Hill gets the
                registration fees. Copy the code, then continue to their signup form.
              </p>
            </header>
            <RunForCharityRegisterBridge />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
