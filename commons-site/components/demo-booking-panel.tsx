import { getDemoBookingEmbedUrl, getDemoBookingUrl } from '@/lib/demo-booking'

/**
 * Light-theme Cal.com booking embed when a booking URL is available.
 * Mirrors Business Rocket DemoBookingPanel.
 */
export function DemoBookingPanel({ bare = false }: { bare?: boolean }) {
  const url = getDemoBookingUrl()
  const embedUrl = getDemoBookingEmbedUrl()
  if (!url || !embedUrl) return null

  const body = (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Live calendar
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Pick a demo time</h3>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-semibold text-emerald-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-emerald-900"
        >
          Open in new tab →
        </a>
      </div>
      <div className="min-h-[680px] w-full overflow-hidden rounded-xl border border-zinc-200/90 bg-white">
        <iframe
          title="Book a Pavilion demo"
          src={embedUrl}
          height="100%"
          style={{ minHeight: '650px' }}
          className="h-full min-h-[650px] w-full border-0 bg-white"
          loading="lazy"
          allow="camera; microphone; fullscreen"
        />
      </div>
    </>
  )

  if (bare) return <div>{body}</div>

  return <div className="card-surface">{body}</div>
}
