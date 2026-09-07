/** Fall Family Fest — Friday Sep 25, 2026 · 5–8 p.m. on school fields. */
export const FALL_FAMILY_FEST_EVENT_SLUG = 'fall-family-fest'

export const FALL_FAMILY_FEST_EVENT_PATH = `/events/${FALL_FAMILY_FEST_EVENT_SLUG}`

export const FALL_FAMILY_FEST_FLYER_URL = '/fall-family-fest-2026.jpg'

export const FALL_FAMILY_FEST_END_ISO = '2026-09-26T04:00:00.000Z'

export function isFallFamilyFestSlug(slug?: string | null): boolean {
  const s = String(slug || '').trim().toLowerCase()
  return s === FALL_FAMILY_FEST_EVENT_SLUG || s.includes('fall-family-fest')
}

export function stillShowingFallFamilyFest(now = new Date()): boolean {
  return now < new Date(FALL_FAMILY_FEST_END_ISO)
}
