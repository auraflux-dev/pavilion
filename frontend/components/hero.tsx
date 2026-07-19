import { Button } from '@/components/ui/button'
import { Users, BookOpen, Heart } from 'lucide-react'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'

function resolveHomeImage(raw: string, fallback: string): string {
  const url = (raw || '').trim()
  if (!url || url.includes('placeholder.svg')) return fallback
  return url
}

export async function Hero() {
  const [settings, content] = await Promise.all([getSiteSettings(), getPageContent('home')])
  const inSession = settings.getBool('schoolInSession', false)
  const stats = [
    { value: settings.get('heroStatFamilies', '500+'), label: 'Student Families' },
    ...(inSession
      ? [{ value: settings.get('heroStatPrograms', '12+'), label: 'Active Programs' }]
      : [{ value: 'Year-round', label: 'The Cove shop' }]),
    { value: settings.get('heroStatVolunteers', '200+'), label: 'Volunteers' },
  ]

  const topImage = resolveHomeImage(
    settings.get('homeHeroImageTopUrl', '/home/hero-top.jpg'),
    '/home/hero-top.jpg'
  )
  const bottomImage = resolveHomeImage(
    settings.get('homeHeroImageBottomUrl', '/home/hero-bottom.jpg'),
    '/home/hero-bottom.jpg'
  )
  const topAlt = settings.get(
    'homeHeroImageTopAlt',
    'Students learning together in a classroom'
  )
  const bottomAlt = settings.get(
    'homeHeroImageBottomAlt',
    'SHMS students engaged in learning'
  )

  return (
    <section
      className="relative overflow-hidden py-16 md:py-24 lg:py-28"
      style={{ backgroundColor: '#085508' }}
      aria-label="Welcome banner"
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className="absolute right-0 bottom-0 w-96 h-96 opacity-[0.04] translate-x-1/4 translate-y-1/4"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="white">
          <path d="M100 20 C60 20, 10 60, 10 100 C10 140, 60 170, 100 170 C140 170, 190 140, 190 100 C190 60, 140 20, 100 20 Z M100 50 C130 50, 160 70, 160 100 C160 130, 130 150, 100 150 C70 150, 40 130, 40 100 C40 70, 70 50, 100 50 Z" />
          <path d="M100 150 L95 185 L100 195 L105 185 Z" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" aria-hidden="true" />
              <span className="text-white/90 text-xs font-semibold tracking-wider uppercase">
                {content.eyebrow}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance mb-5">
              {content.title}
            </h1>

            <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-8 max-w-2xl text-pretty">
              {content.body}
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Button
                size="lg"
                className="text-white font-bold px-6 sm:px-8 shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#064206' }}
                asChild
              >
                <a href={content.ctaHref || '/membership'}>
                  <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                  {content.ctaLabel || 'Become a member'}
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="font-bold px-6 sm:px-8 border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#085508] transition-colors"
                asChild
              >
                <a href="/cove">
                  <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                  Shop The Cove
                </a>
              </Button>

              <Button
                size="lg"
                className="text-white font-bold px-6 sm:px-8 shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#064206' }}
                asChild
              >
                <a href="/volunteer">
                  <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                  Volunteer
                </a>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 sm:gap-12">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="w-full rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/15 aspect-[3/2] bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topImage}
                alt={topAlt}
                className="w-full h-full object-cover object-center"
                width={900}
                height={600}
                loading="eager"
              />
            </div>

            <div className="w-[92%] ml-auto rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/15 aspect-[16/9] bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottomImage}
                alt={bottomAlt}
                className="w-full h-full object-cover object-center"
                width={900}
                height={500}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" aria-hidden="true">
        <svg
          viewBox="0 0 1440 60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-10 sm:h-14"
        >
          <path
            d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"
            fill="#F5F0E8"
          />
        </svg>
      </div>
    </section>
  )
}
