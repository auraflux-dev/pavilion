import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { VolunteerForm } from '@/components/volunteer/volunteer-form'
import { CheckCircle2 } from 'lucide-react'

const BENEFITS = [
  'Make a direct impact on student enrichment',
  'Connect with other SHMS families',
  'Flexible time commitments for every schedule',
  'Be part of school events and celebrations',
  'Help run the school store and support students daily',
]

const OPPORTUNITIES = [
  {
    title: 'School Store Window',
    description: 'Help students purchase items using their store cards. Shifts are 20–30 minutes during lunch.',
    commitment: 'Weekly · 30 min',
    accent: '#085508',
  },
  {
    title: 'Event Support',
    description: 'Set up, run, and break down events like Dance Night, NOVA Math, and seasonal celebrations.',
    commitment: 'As needed · 2–4 hrs',
    accent: '#8B1A1A',
  },
  {
    title: 'Program Chaperone',
    description: 'Accompany students to enrichment activities and off-site competitions.',
    commitment: 'Per event',
    accent: '#2A8B7A',
  },
  {
    title: 'Fundraiser Support',
    description: 'Help coordinate peer fundraisers, sort donations, and cheer on participating students.',
    commitment: 'Seasonal',
    accent: '#9A3412',
  },
]

export default function VolunteerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        {/* Hero */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#085508' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              Get Involved
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Volunteer With Us
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Every hour you give helps create a richer experience for every student
              at Stone Hill Middle School.
            </p>
          </div>
        </section>

        {/* Two-column: why volunteer + form */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

              {/* Left: benefits + opportunities */}
              <div>
                <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">
                  Why Volunteers Matter
                </h2>
                <ul className="space-y-3.5 mb-12" aria-label="Volunteer benefits">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-5 h-5 mt-0.5 shrink-0"
                        style={{ color: '#085508' }}
                        aria-hidden="true"
                      />
                      <span className="text-[#1A1A1A] text-sm sm:text-base">{b}</span>
                    </li>
                  ))}
                </ul>

                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
                  Ways to Get Involved
                </h2>
                <div className="space-y-4">
                  {OPPORTUNITIES.map((opp) => (
                    <div
                      key={opp.title}
                      className="rounded-xl p-4 border border-[#E8E4DC] flex gap-4"
                    >
                      <div
                        className="w-1 rounded-full shrink-0"
                        style={{ backgroundColor: opp.accent }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-[#1A1A1A] text-sm">{opp.title}</h3>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F3F6FC', color: '#5A6070' }}
                          >
                            {opp.commitment}
                          </span>
                        </div>
                        <p className="text-sm text-[#5A6070]">{opp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: form */}
              <div className="lg:sticky lg:top-8">
                <VolunteerForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
