import { getPageContent } from '@/lib/api/page-content'
import { getSiteSettings } from '@/lib/api/site-settings'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

const DEFAULT_IMAGE = '/home/community.jpg'

/** Put "Go Stingrays!" on its own line when it trails the community headline. */
function splitCommunityHeadline(raw: string): string[] {
  const text = raw.replace(/\\n/g, '\n').trim()
  if (!text) return []
  if (text.includes('\n')) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean)
  }
  const match = text.match(/^(.*?)\.\s+(Go (?:Stingrays|Hawks)!?)$/i)
  if (match?.[1] && match[2]) {
    return [`${match[1].trim()}.`, match[2]]
  }
  return [text]
}

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
    isDemoInstance() ? `${DEMO_BRAND.pto} community` : 'Stone Hill Middle School PTO community'
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
            {splitCommunityHeadline(headline).map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </section>
  )
}
