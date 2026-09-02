/** Best Runners partnership. Register goes straight to Best Runners with SHMS applied. */
export const RUN_FOR_CHARITY_SCHOOL_CODE = 'SHMS'

export const RUN_FOR_CHARITY_EVENT_SLUG =
  'run-for-charity-1k-5k-best-runners-code-shms'

/** Informational event page on our site (schedule, copy). Not the register CTA. */
export const RUN_FOR_CHARITY_EVENT_PATH = `/events/${RUN_FOR_CHARITY_EVENT_SLUG}`

export const RUN_FOR_CHARITY_REGISTER_HASH = '#register'

/** @deprecated Prefer BEST_RUNNERS_SIGNUP_URL for register CTAs. */
export const RUN_FOR_CHARITY_REGISTER_PATH = `${RUN_FOR_CHARITY_EVENT_PATH}${RUN_FOR_CHARITY_REGISTER_HASH}`

/** @deprecated Use RUN_FOR_CHARITY_EVENT_PATH. old bridge redirects to Best Runners signup. */
export const RUN_FOR_CHARITY_BRIDGE_PATH = '/run-for-charity'

export const RUN_FOR_CHARITY_BRIDGE_URL = `https://www.shmspto.org${RUN_FOR_CHARITY_EVENT_PATH}`

/** Best Runners signup with school code SHMS already on the URL. */
export const BEST_RUNNERS_SIGNUP_URL =
  'https://bestrunners.org/register/signup?ref=SHMS'

/**
 * Canonical register URL for flyer taps, portal rail, receipts, fundraising CTAs.
 * Always Best Runners with ref=SHMS (no middle hop on our site).
 */
export const RUN_FOR_CHARITY_REGISTER_URL = BEST_RUNNERS_SIGNUP_URL

/** Current official flyer image (QR on flyer should match BEST_RUNNERS_SIGNUP_URL). */
export const RUN_FOR_CHARITY_FLYER_PDF_URL = '/events/run-for-charity-2026.jpg'

export function isRunForCharitySlug(slug?: string | null): boolean {
  return String(slug || '').trim() === RUN_FOR_CHARITY_EVENT_SLUG
}

export function isRunForCharityEvent(event: {
  slug?: string | null
  title?: string | null
  externalRegistrationUrl?: string | null
}): boolean {
  if (isRunForCharitySlug(event.slug)) return true
  const hay = `${event.title || ''} ${event.externalRegistrationUrl || ''}`.toLowerCase()
  return (
    hay.includes('run-for-charity') ||
    (hay.includes('best runners') && hay.includes('shms'))
  )
}

export const RUN_FOR_CHARITY_FLYER_IMAGE_PATH = RUN_FOR_CHARITY_FLYER_PDF_URL

export const RUN_FOR_CHARITY_FLYER_IMAGE_URL = `https://www.shmspto.org${RUN_FOR_CHARITY_FLYER_IMAGE_PATH}`

/** Race day (America/New_York). Promo ends after this calendar day. */
export const RUN_FOR_CHARITY_RACE_DATE = '2026-09-13'

/** Email-friendly flyer width (~791:1024). */
export const RUN_FOR_CHARITY_RECEIPT_FLYER_WIDTH = 280

export function runForCharityPriceLine(): string {
  return '$20 to $50'
}

function etCalendarDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Hide portal rail / receipt promo after race day. */
export function stillShowingRunForCharity(now = new Date()): boolean {
  return etCalendarDate(now) <= RUN_FOR_CHARITY_RACE_DATE
}

/** Plain-text footer appended to purchase receipts / portal messages. */
export function runForCharityReceiptTextFooter(): string {
  if (!stillShowingRunForCharity()) return ''
  return [
    '',
    '—',
    'Run for Charity 1K & 5K · Sunday, Sep 13, 2026',
    'Best Runners hosts · school code SHMS (100% of your fee supports Stone Hill).',
    `Register: ${BEST_RUNNERS_SIGNUP_URL}`,
    `Flyer: ${RUN_FOR_CHARITY_FLYER_IMAGE_URL}`,
  ].join('\n')
}

/** HTML block for purchase confirmation emails (280px flyer). */
export function runForCharityReceiptHtmlBlock(): string {
  if (!stillShowingRunForCharity()) return ''
  const w = RUN_FOR_CHARITY_RECEIPT_FLYER_WIDTH
  const h = Math.round((w * 1024) / 791)
  return `
<div style="margin:28px 0 8px;padding-top:20px;border-top:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A">
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1B6B45">Coming up</p>
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;line-height:1.3">Run for Charity 1K &amp; 5K · Sun Sep 13</p>
  <p style="margin:0 0 14px;font-size:13px;line-height:1.45;color:#4B5563">Best Runners hosts. Use school code SHMS so Stone Hill receives 100% of your registration fee.</p>
  <a href="${BEST_RUNNERS_SIGNUP_URL}" style="display:inline-block;text-decoration:none">
    <img src="${RUN_FOR_CHARITY_FLYER_IMAGE_URL}" width="${w}" height="${h}" alt="Run for Charity 1K and 5K flyer — Sunday September 13 2026 at Rock Ridge High School" style="display:block;width:${w}px;max-width:100%;height:auto;border:0;border-radius:8px" />
  </a>
  <p style="margin:12px 0 0;font-size:13px">
    <a href="${BEST_RUNNERS_SIGNUP_URL}" style="color:#1B6B45;font-weight:700;text-decoration:underline">Register with school code SHMS →</a>
  </p>
</div>`
}
