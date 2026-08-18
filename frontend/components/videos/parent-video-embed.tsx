'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ParentVideo } from '@/lib/videos/parent-videos'

interface ParentVideoEmbedProps {
  video: ParentVideo
  /** Compact card for grids; default is a full-width player block */
  compact?: boolean
}

export function ParentVideoEmbed({ video, compact = false }: ParentVideoEmbedProps) {
  const [copied, setCopied] = useState(false)
  const [pageLink, setPageLink] = useState(`#${video.id}`)

  useEffect(() => {
    setPageLink(`${window.location.origin}${window.location.pathname}#${video.id}`)
    const scrollToHash = () => {
      if (window.location.hash !== `#${video.id}`) return
      document.getElementById(video.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [video.id])

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#${video.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this video link:', url)
    }
  }, [video.id])

  return (
    <figure
      id={video.id}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-sm"
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
        <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <a
            href={pageLink}
            className="min-w-0 break-all text-xs leading-relaxed hover:underline"
            style={{ color: '#085508' }}
          >
            {pageLink}
          </a>
          <button
            type="button"
            className="shrink-0 self-start text-xs font-bold hover:underline"
            style={{ color: '#085508' }}
            onClick={() => void copyLink()}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </figcaption>
    </figure>
  )
}
