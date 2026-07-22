import { getPageContent } from '@/lib/api/page-content'
import { getSiteSettings } from '@/lib/api/site-settings'

const DEFAULT_IMAGE = '/home/community.jpg'

function resolveHomeImageUrl(raw: string, fallback: string): string {
  const url = (raw || '').trim()
  if (!url) return fallback
  if (url.includes('placeholder.svg')) return fallback
  return url
}

export async function CommunityBanner() {
  const [content, settings] = await Promise.all([
    getPageContent('home-community'),
    getSiteSettings(),
  ])

  const imageUrl = resolveHomeImageUrl(
    settings.get('homeCommunityImageUrl', DEFAULT_IMAGE),
    DEFAULT_IMAGE
  )
  const imageAlt = settings.get(
    'homeCommunityImageAlt',
    'Stone Hill Middle School PTO community'
  )
  const headline = content.title || content.body

  return (
    <section
      className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden"
      aria-label="Community photo"
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #F5F0E8 0%, rgba(245,240,232,0.55) 28%, rgba(245,240,232,0.2) 55%, transparent 100%), linear-gradient(0deg, rgba(8,85,8,0.25), rgba(8,85,8,0.15))',
        }}
        aria-hidden="true"
      />
      {headline ? (
        <div className="absolute inset-0 flex items-center justify-center md:justify-start">
          <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center md:text-left px-6 md:px-16 drop-shadow-md max-w-3xl">
            {headline}
          </p>
        </div>
      ) : null}
    </section>
  )
}
