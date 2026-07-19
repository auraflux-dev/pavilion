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
      className="relative w-full h-48 sm:h-64 md:h-72 overflow-hidden"
      aria-label="Community photo"
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      {headline ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center px-4 drop-shadow-lg">
            {headline}
          </p>
        </div>
      ) : null}
    </section>
  )
}
