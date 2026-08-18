import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { PageHero } from '@/components/page-hero'
import { NewsletterSignup } from '@/components/newsletter/newsletter-signup'
import { getPageContent } from '@/lib/api/page-content'
import { Mail, Bell, Calendar, BookOpen } from 'lucide-react'

const NEWSLETTER_PERKS = [
  {
    icon: Bell,
    title: 'Event Reminders',
    description: 'Never miss Dance Night, NOVA Math, PTO meetings, or any school event.',
  },
  {
    icon: BookOpen,
    title: 'Program Announcements',
    description: 'Be first to know when enrichment program registration opens.',
  },
  {
    icon: Calendar,
    title: 'Monthly Recap',
    description: 'A concise summary of what happened and what\'s coming up next month.',
  },
  {
    icon: Mail,
    title: 'Important Updates',
    description: 'School store news, fundraiser launches, and board announcements.',
  },
]

export default async function NewsletterPage() {
  const page = await getPageContent('newsletter')

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <PageHero content={page} />

        {/* Sign up + perks */}
        <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Left: perks */}
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">
                  What you&apos;ll get
                </h2>
                <div className="space-y-6">
                  {NEWSLETTER_PERKS.map(({ icon: Icon, title, description }) => (
                    <div key={title} className="flex gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--brand-soft)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1A1A1A] text-sm mb-1">{title}</h3>
                        <p className="text-sm text-[#5A6070] leading-relaxed">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#5A6070] mt-8">
                  No spam. Unsubscribe at any time. We send 1 to 2 emails per month.
                </p>
              </div>

              {/* Right: form */}
              <div>
                <NewsletterSignup />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
