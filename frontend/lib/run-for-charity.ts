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
