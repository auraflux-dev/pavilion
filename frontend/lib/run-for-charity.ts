/** Best Runners partnership — school code on the event page (no middle hop). */
export const RUN_FOR_CHARITY_SCHOOL_CODE = 'SHMS'

export const RUN_FOR_CHARITY_EVENT_SLUG =
  'run-for-charity-1k-5k-best-runners-code-shms'

/** Canonical share / register page (school code + continue to Best Runners). */
export const RUN_FOR_CHARITY_EVENT_PATH = `/events/${RUN_FOR_CHARITY_EVENT_SLUG}`

export const RUN_FOR_CHARITY_REGISTER_HASH = '#register'

export const RUN_FOR_CHARITY_REGISTER_PATH = `${RUN_FOR_CHARITY_EVENT_PATH}${RUN_FOR_CHARITY_REGISTER_HASH}`

/** @deprecated Use RUN_FOR_CHARITY_EVENT_PATH — old bridge redirects there. */
export const RUN_FOR_CHARITY_BRIDGE_PATH = '/run-for-charity'

export const RUN_FOR_CHARITY_BRIDGE_URL = `https://www.shmspto.org${RUN_FOR_CHARITY_EVENT_PATH}`

export const RUN_FOR_CHARITY_REGISTER_URL = `https://www.shmspto.org${RUN_FOR_CHARITY_REGISTER_PATH}`

/** Best Runners signup with SHMS referral already on the URL. */
export const BEST_RUNNERS_SIGNUP_URL =
  'https://bestrunners.org/register/signup?ref=SHMS'

/** Current official flyer (QR encodes the SHMS signup URL). */
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
