import type { ParentVideo } from '@/lib/videos/parent-videos'

interface ParentVideoEmbedProps {
  video: ParentVideo
  /** Compact card for grids; default is a full-width player block */
  compact?: boolean
}

export function ParentVideoEmbed({ video, compact = false }: ParentVideoEmbedProps) {
  return (
    <figure
      className={
        compact
          ? 'overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-sm'
          : 'overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-sm'
      }
    >
      <div className="relative aspect-video bg-[#1A1A1A]">
        <video
          className="h-full w-full"
          controls
          playsInline
          preload="metadata"
          poster={video.poster}
          title={video.title}
        >
          <source src={video.src} type="video/mp4" />
          Your browser does not support embedded video.
        </video>
      </div>
      <figcaption className={compact ? 'p-4' : 'p-5 sm:p-6'}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-bold text-[#1A1A1A] sm:text-lg">{video.title}</h3>
          <span className="text-xs font-medium text-[#8A9099]">{video.durationLabel}</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[#5A6070]">{video.summary}</p>
      </figcaption>
    </figure>
  )
}
