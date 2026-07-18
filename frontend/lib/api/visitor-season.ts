import { getSiteSettings } from '@/lib/api/site-settings'

/**
 * School-year gate for visitor marketing surfaces.
 * SiteSettings key `schoolInSession` — set to "true" when programs/events resume.
 * Default when unset: false (summer / off-session).
 */
export async function isSchoolInSession(): Promise<boolean> {
  const settings = await getSiteSettings()
  return settings.getBool('schoolInSession', false)
}

/** Paths hidden from visitor nav/footer while school is out of session. */
export const OFF_SEASON_HIDDEN_PATHS = new Set(['/programs', '/events'])

/** Legacy commerce paths that should resolve to The Cove. */
export const COVE_PATHS = new Set(['/cove', '/store', '/spirit-wear'])
