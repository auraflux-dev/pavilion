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
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            Live calendar
          </div>
          <h3 className="mt-1 font-sans text-lg font-bold tracking-tight text-[var(--brand-text)]">
            Pick a demo time
          </h3>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-semibold text-[var(--brand-primary)] underline decoration-[var(--brand-line)] underline-offset-2 hover:decoration-[var(--brand-primary)]"
        >
          Open in new tab →
        </a>
      </div>
      <div className="min-h-[680px] w-full overflow-hidden rounded-xl border border-[var(--brand-line)]/80 bg-white">
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
