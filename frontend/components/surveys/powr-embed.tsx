'use client'

/**
 * Renders a POWR survey embed.
 * Only https://*.powr.io URLs are allowed. no arbitrary HTML/srcDoc execution.
 */

function isAllowedPowrUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return host === 'powr.io' || host === 'www.powr.io' || host.endsWith('.powr.io')
  } catch {
    return false
  }
}

function extractPowrSrc(htmlOrUrl: string): string | null {
  const trimmed = htmlOrUrl.trim()
  if (!trimmed) return null

  if (isAllowedPowrUrl(trimmed)) return trimmed

  const srcMatch = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
  const src = srcMatch?.[1]?.trim()
  if (src && isAllowedPowrUrl(src)) return src

  // POWR sometimes uses data-powr-id scripts. pull iframe fallback URLs if present
  const urlMatch = trimmed.match(/https:\/\/(?:www\.)?(?:[\w-]+\.)?powr\.io\/[^\s"'<>]+/i)
  if (urlMatch?.[0] && isAllowedPowrUrl(urlMatch[0])) return urlMatch[0]

  return null
}

export function PowrEmbed({ html, title = 'Survey' }: { html: string; title?: string }) {
  const src = extractPowrSrc(html)

  if (!src) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center">
        <p className="text-sm font-semibold text-[#1A1A1A]">POWR embed could not be shown</p>
        <p className="text-xs text-[#5A6070] mt-1">
          Paste a powr.io iframe URL or embed that includes an https://powr.io src.
        </p>
      </div>
    )
  }

  return (
    <iframe
      src={src}
      title={title}
      className="w-full min-h-[640px] rounded-2xl border border-[var(--border)] bg-white"
      loading="lazy"
      referrerPolicy="no-referrer"
      // Scripts/forms needed for POWR; omit allow-same-origin to avoid sandbox escape.
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="clipboard-write"
    />
  )
}
