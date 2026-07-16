import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { getPageContent } from '@/lib/api/page-content'
import { getSiteSettings } from '@/lib/api/site-settings'

const DEFAULT_IMAGE = '/placeholder.svg?height=450&width=600'
const DEFAULT_SECONDARY = 'Learn More'

export async function VolunteerSection() {
  const [content, settings] = await Promise.all([
    getPageContent('home-volunteer'),
    getSiteSettings(),
  ])

  const imageUrl = settings.get('homeVolunteerImageUrl', DEFAULT_IMAGE)
  const imageAlt = settings.get(
    'homeVolunteerImageAlt',
    'SHMS students and parent volunteers working together at a school event'
  )
  const secondaryLabel = settings.get('homeVolunteerSecondaryCta', DEFAULT_SECONDARY)
  const href = content.ctaHref || '/volunteer'
  const primaryLabel = content.ctaLabel || 'Join Today'
  const quote = content.sectionTitle
  const attribution = content.sectionBody

  return (
    <section
      id="volunteer"
      className="py-20 md:py-28 bg-white"
      aria-labelledby="volunteer-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            {content.eyebrow ? (
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5"
                style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
              >
                {content.eyebrow}
              </div>
            ) : null}

            <h2
              id="volunteer-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-5"
              style={{ color: '#1A1A1A' }}
            >
              {content.title}
            </h2>

            <p className="text-base sm:text-lg text-[#5A6070] leading-relaxed mb-8 text-pretty">
              {content.body}
            </p>

            {content.bullets.length > 0 ? (
              <ul className="space-y-3.5 mb-10" aria-label="Volunteer benefits">
                {content.bullets.map((benefit) => (
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
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="text-white font-bold group"
                style={{ backgroundColor: '#085508' }}
                asChild
              >
                <a href={href}>
                  {primaryLabel}
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
                <a href={href}>{secondaryLabel}</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full h-full object-cover"
                width={600}
                height={450}
              />
              {quote ? (
                <div
                  className="absolute bottom-4 left-4 right-4 rounded-xl p-4 backdrop-blur-sm border border-white/20"
                  style={{ backgroundColor: 'rgba(8,85,8,0.9)' }}
                >
                  <p className="text-white font-semibold text-sm">
                    &quot;{quote}&quot;
                  </p>
                  {attribution ? (
                    <p className="text-white/70 text-xs mt-1.5">{attribution}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div
              className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl -z-10"
              style={{ backgroundColor: '#F5F0E8' }}
              aria-hidden="true"
            />
            <div
              className="absolute -top-4 -left-4 w-20 h-20 rounded-xl -z-10"
              style={{ backgroundColor: '#EEF6EE' }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
