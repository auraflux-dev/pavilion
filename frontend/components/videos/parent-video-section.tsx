import { ParentVideoEmbed } from '@/components/videos/parent-video-embed'
import {
  parentVideosFor,
  type ParentVideo,
  getParentVideo,
  type ParentVideoId,
} from '@/lib/videos/parent-videos'
import { isDemoInstance } from '@/lib/demo/instance'
import { isCommonsPlatform } from '@/lib/crm/active-trial'

interface ParentVideoSectionProps {
  placement?: ParentVideo['placements'][number]
  /** Show a single video by id instead of all for a placement */
  videoId?: ParentVideoId
  eyebrow?: string
  title: string
  body?: string
  /** Section anchor id */
  id?: string
  className?: string
  background?: string
}

export function ParentVideoSection({
  placement,
  videoId,
  eyebrow = 'Watch',
  title,
  body,
  id = 'videos',
  className = '',
  background = 'var(--brand-warm)',
}: ParentVideoSectionProps) {
  // SHMS explainers only. never on Riverside demo or private Commons trials.
  if (isDemoInstance() || isCommonsPlatform()) return null
  const videos = videoId
    ? ([getParentVideo(videoId)].filter(Boolean) as ParentVideo[])
    : placement
      ? parentVideosFor(placement)
      : []

  if (videos.length === 0) return null

  const single = videos.length === 1
  // Player figures use video.id as the hash target. Don't duplicate that on the section.
  const sectionId = videoId && id === videoId ? `${id}-section` : id

  return (
    <section
      id={sectionId}
      className={`scroll-mt-28 py-12 md:py-16 ${className}`}
      style={{ backgroundColor: background }}
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`mb-8 ${single ? 'max-w-3xl' : 'max-w-2xl'}`}>
          <div
            className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {eyebrow}
          </div>
          <h2 id={`${sectionId}-heading`} className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
            {title}
          </h2>
          {body ? <p className="mt-3 text-[#5A6070] leading-relaxed">{body}</p> : null}
        </div>

        {single ? (
          <div className="mx-auto max-w-3xl">
            <ParentVideoEmbed video={videos[0]} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {videos.map((video) => (
              <ParentVideoEmbed key={video.id} video={video} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
