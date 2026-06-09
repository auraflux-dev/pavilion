import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const benefits = [
  'Make a direct impact on student enrichment',
  'Connect with other SHMS families',
  'Flexible time commitments for every schedule',
  'Be part of school events and celebrations',
]

export function VolunteerSection() {
  return (
    <section
      id="volunteer"
      className="py-20 md:py-28 bg-white"
      aria-labelledby="volunteer-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: content */}
          <div>
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
            >
              Get Involved
            </div>

            <h2
              id="volunteer-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-5"
              style={{ color: '#1A1A1A' }}
            >
              Volunteer{' '}
              <span style={{ color: '#085508' }}>With Us</span>
            </h2>

            <p className="text-base sm:text-lg text-[#5A6070] leading-relaxed mb-8 text-pretty">
              Every hour you volunteer helps create a richer, more vibrant experience
              for every student at Stone Hill Middle School. Whether you can give an
              hour a month or a few hours a week, your time makes a real difference.
            </p>

            <ul className="space-y-3.5 mb-10" aria-label="Volunteer benefits">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={{ color: '#085508' }}
                    aria-hidden="true"
                  />
                  <span className="text-[#1A1A1A] text-sm sm:text-base">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="text-white font-bold group"
                style={{ backgroundColor: '#085508' }}
                asChild
              >
                <a href="/volunteer">
                  Join Today
                  <ArrowRight
                    className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-semibold border-2"
                style={{ borderColor: '#085508', color: '#085508' }}
                asChild
              >
                <a href="#contact">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Right: image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl">
              <img
                src="/placeholder.svg?height=450&width=600"
                alt="SHMS students and parent volunteers working together at a school event"
                className="w-full h-full object-cover"
                width={600}
                height={450}
              />
              {/* Overlay card */}
              <div
                className="absolute bottom-4 left-4 right-4 rounded-xl p-4 backdrop-blur-sm border border-white/20"
                style={{ backgroundColor: 'rgba(8,85,8,0.9)' }}
              >
                <p className="text-white font-semibold text-sm">
                  &quot;Volunteering with SHMS PTO has been one of the most rewarding
                  experiences of our family&apos;s school year.&quot;
                </p>
                <p className="text-white/70 text-xs mt-1.5">— SHMS Parent, 2025–2026</p>
              </div>
            </div>

            {/* Decorative accent */}
            <div
              className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl -z-10"
              style={{ backgroundColor: '#F5F0E8' }}
              aria-hidden="true"
            />
            <div
              className="absolute -top-4 -left-4 w-20 h-20 rounded-xl -z-10"
              style={{ backgroundColor: '#EAF5F3' }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
